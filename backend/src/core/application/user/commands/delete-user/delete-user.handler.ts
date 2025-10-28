import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DeleteUserCommand } from './delete-user.command';
import { IUserRepository } from '@core/domain/user/interfaces/user.repository.interface';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { UserRole } from '@shared/constants/user-roles.constant';

export interface DeleteUserWarnings {
  hasWarnings: boolean;
  walletBalance: number;
  warnings: string[];
}

@Injectable()
export class DeleteUserHandler {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    // 1. Find user
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // 2. ⭐ HARD VALIDATION 1: Không cho xóa ADMIN
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Không thể xóa tài khoản admin');
    }

    // 3. ⭐ HARD VALIDATION 2: Không có tuyến dưới (CORE LOGIC - CANNOT OVERRIDE)
    const downlineCount = await this.prisma.user.count({
      where: {
        sponsorId: command.userId,
        status: { notIn: ['INACTIVE', 'REJECTED'] }, // Chỉ count active downline
      },
    });

    if (downlineCount > 0) {
      throw new BadRequestException(
        `Không thể xóa tài khoản vì còn ${downlineCount} tuyến dưới. ` +
        `Vui lòng xóa tất cả tuyến dưới trước (xóa từ dưới lên trên).`
      );
    }

    // 4. ⭐ AUTO-CANCEL: Tự động hủy commission đang chờ
    const pendingCommissions = await this.prisma.commission.findMany({
      where: {
        userId: command.userId,
        status: { in: ['PENDING', 'APPROVED'] },
      },
      select: { id: true, commissionAmount: true, status: true, level: true },
    });

    if (pendingCommissions.length > 0) {
      // Cancel all pending commissions
      await this.prisma.commission.updateMany({
        where: {
          userId: command.userId,
          status: { in: ['PENDING', 'APPROVED'] },
        },
        data: {
          status: 'CANCELLED',
          notes: 'Hoa hồng tự động hủy do tài khoản bị xóa bởi admin',
        },
      });
    }

    // 5. ⭐ HARD VALIDATION 4: Không có yêu cầu rút tiền đang chờ
    const pendingWithdrawals = await this.prisma.withdrawalRequest.count({
      where: {
        userId: command.userId,
        status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] },
      },
    });

    if (pendingWithdrawals > 0) {
      throw new BadRequestException(
        `Không thể xóa tài khoản vì còn ${pendingWithdrawals} yêu cầu rút tiền đang xử lý. ` +
        `Vui lòng hoàn tất hoặc hủy các yêu cầu trước.`
      );
    }

    // 6. ⭐ AUTO-CANCEL: Tự động hủy đơn hàng đang xử lý
    const activeOrders = await this.prisma.order.findMany({
      where: {
        userId: command.userId,
        status: {
          notIn: ['COMPLETED', 'CANCELLED', 'REFUNDED'],
        },
      },
      select: { id: true, orderNumber: true, status: true },
    });

    if (activeOrders.length > 0) {
      // Cancel all active orders
      await this.prisma.order.updateMany({
        where: {
          userId: command.userId,
          status: {
            notIn: ['COMPLETED', 'CANCELLED', 'REFUNDED'],
          },
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          adminNote: 'Đơn hàng tự động hủy do tài khoản bị xóa bởi admin',
        },
      });
    }

    // 7. ⚠️ SOFT WARNING: Wallet balance > 0 (CẦN CONFIRM)
    const walletBalance = await this.userRepository.getWalletBalance(command.userId);

    if (walletBalance > 0 && !command.confirmed) {
      const balanceFormatted = walletBalance.toLocaleString('vi-VN');
      throw new BadRequestException(
        JSON.stringify({
          code: 'CONFIRMATION_REQUIRED',
          message: `Tài khoản còn ${balanceFormatted} VND trong ví. ` +
                   `Số tiền này sẽ bị mất khi xóa tài khoản. Bạn có chắc chắn muốn xóa?`,
          walletBalance: walletBalance,
          requireConfirmation: true,
        })
      );
    }

    // 8. ✅ TẤT CẢ VALIDATION PASSED hoặc CONFIRMED → Thực hiện soft delete
    await this.userRepository.update(command.userId, {
      status: 'INACTIVE' as any,
      lockedAt: new Date(),
      lockedReason: walletBalance > 0
        ? `Tài khoản đã bị xóa bởi admin. Số dư ví bị mất: ${walletBalance.toLocaleString('vi-VN')} VND`
        : 'Tài khoản đã bị xóa bởi admin',
    });

    // 9. ✅ Double-check: Cancel any remaining commissions (safety net)
    // Note: Should already be cancelled in step 4, this is just a safety check
    await this.prisma.commission.updateMany({
      where: {
        userId: command.userId,
        status: { notIn: ['PAID', 'CANCELLED'] },
      },
      data: {
        status: 'CANCELLED',
        notes: 'Hoa hồng tự động hủy do tài khoản bị xóa bởi admin',
      },
    });

    // 10. ✅ Hủy pending orders (nếu có)
    await this.prisma.pendingOrder.updateMany({
      where: {
        userId: command.userId,
        status: 'AWAITING_PAYMENT',
      },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    // 11. ✅ Xóa cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId: command.userId },
    });

    if (cart) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    // 12. ✅ Log wallet balance lost (nếu có)
    if (walletBalance > 0) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId: command.userId },
        select: { id: true },
      });

      if (wallet) {
        await this.prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'ADMIN_ADJUSTMENT', // Using existing enum value
            amount: -walletBalance,
            balanceBefore: walletBalance,
            balanceAfter: 0,
            description: `Số dư bị mất do xóa tài khoản: ${walletBalance.toLocaleString('vi-VN')} VND`,
            metadata: {
              reason: 'account_deletion',
              deletedAt: new Date().toISOString(),
            },
          },
        });

        // Reset wallet to 0
        await this.prisma.wallet.update({
          where: { userId: command.userId },
          data: { balance: 0 },
        });
      }
    }
  }

  /**
   * Check if user can be deleted and return warnings
   * Used by frontend to show confirmation dialog
   */
  async checkDeleteWarnings(userId: string): Promise<DeleteUserWarnings> {
    const warnings: string[] = [];
    let hasWarnings = false;

    // Check wallet balance
    const walletBalance = await this.userRepository.getWalletBalance(userId);
    if (walletBalance > 0) {
      hasWarnings = true;
      const formatted = walletBalance.toLocaleString('vi-VN');
      warnings.push(`Tài khoản còn ${formatted} VND trong ví (số tiền này sẽ bị mất)`);
    }

    return {
      hasWarnings,
      walletBalance,
      warnings,
    };
  }
}
