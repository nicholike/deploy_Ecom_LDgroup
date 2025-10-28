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

    // 2. ⭐ HARD VALIDATION 1: Không cho xóa ROOT ADMIN
    // Admin khác có thể xóa, chỉ root admin (admin đầu tiên) không được xóa
    if (user.role === UserRole.ADMIN) {
      const rootAdmin = await this.userRepository.findRootAdmin();
      if (rootAdmin && user.id === rootAdmin.id) {
        throw new BadRequestException('Không thể xóa tài khoản Root Admin (admin đầu tiên)');
      }
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

    // 8. ✅ TẤT CẢ VALIDATION PASSED hoặc CONFIRMED → Thực hiện HARD DELETE
    // ✅ Anonymize data + Delete user
    await this.prisma.$transaction(async (tx) => {
      const userInfo = `${user.username} (${user.email.value})`;

      // 8.1. ✅ ANONYMIZE Orders - Giữ lại order history nhưng ẩn danh user
      await tx.order.updateMany({
        where: { userId: command.userId },
        data: {
          userId: null,
          adminNote: `[Deleted User] ${userInfo}`,
        },
      });

      // 8.2. ✅ ANONYMIZE Commissions - User NHẬN hoa hồng
      await tx.commission.updateMany({
        where: { userId: command.userId },
        data: {
          userId: null,
          notes: `[Deleted User] Receiver: ${userInfo}`,
        },
      });

      // 8.3. ✅ ANONYMIZE Commissions - User TẠO hoa hồng (từ orders của user)
      await tx.commission.updateMany({
        where: { fromUserId: command.userId },
        data: {
          fromUserId: null,
          notes: `[Deleted User] Buyer: ${userInfo}`,
        },
      });

      // 8.4. ✅ ANONYMIZE Wallet Transactions
      const wallet = await tx.wallet.findUnique({
        where: { userId: command.userId },
      });

      if (wallet) {
        await tx.walletTransaction.updateMany({
          where: { walletId: wallet.id },
          data: {
            description: `[Deleted User] ${userInfo}`,
          },
        });

        // Log wallet balance lost if any
        if (walletBalance > 0) {
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: 'ADMIN_ADJUSTMENT',
              amount: -walletBalance,
              balanceBefore: walletBalance,
              balanceAfter: 0,
              description: `[Deleted User] Số dư bị mất do xóa tài khoản: ${walletBalance.toLocaleString('vi-VN')} VND - ${userInfo}`,
              metadata: {
                reason: 'account_deletion',
                deletedAt: new Date().toISOString(),
              },
            },
          });
        }

        // Delete wallet
        await tx.wallet.delete({
          where: { id: wallet.id },
        });
      }

      // 8.5. ✅ ANONYMIZE Withdrawal Requests
      await tx.withdrawalRequest.updateMany({
        where: { userId: command.userId },
        data: {
          userId: null,
          adminNote: `[Deleted User] ${userInfo}`,
        },
      });

      // 8.6. ✅ DELETE Pending Orders
      await tx.pendingOrder.deleteMany({
        where: { userId: command.userId },
      });

      // 8.7. ✅ DELETE Cart Items & Cart
      const cart = await tx.cart.findUnique({
        where: { userId: command.userId },
      });

      if (cart) {
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });

        await tx.cart.delete({
          where: { id: cart.id },
        });
      }

      // 8.8. ✅ DELETE UserTree entries
      await tx.userTree.deleteMany({
        where: {
          OR: [
            { ancestor: command.userId },
            { descendant: command.userId },
          ],
        },
      });

      // 8.9. ✅ DELETE User (FINALLY!)
      await tx.user.delete({
        where: { id: command.userId },
      });
    });
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
