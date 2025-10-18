import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { WalletRepository } from '@infrastructure/database/repositories/wallet.repository';
import { WithdrawalRepository } from '@infrastructure/database/repositories/withdrawal.repository';
import { WithdrawalStatus, WalletTransactionType } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { UserRepository } from '@infrastructure/database/repositories/user.repository';

/**
 * WALLET SERVICE
 *
 * Handles:
 * - Wallet balance queries
 * - Withdrawal requests
 * - Admin withdrawal processing
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  // Minimum withdrawal amount (500,000 VND)
  private readonly MIN_WITHDRAWAL_AMOUNT = 500000;

  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly withdrawalRepository: WithdrawalRepository,
    private readonly emailService: EmailService,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Get wallet balance for a user
   */
  async getBalance(userId: string): Promise<number> {
    return this.walletRepository.getBalance(userId);
  }

  /**
   * Get wallet details including transactions
   */
  async getWallet(userId: string) {
    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) {
      // Auto create wallet if not exists
      return this.walletRepository.findOrCreateByUserId(userId);
    }
    return wallet;
  }

  /**
   * Get transaction history
   */
  async getTransactions(
    userId: string,
    page: number = 1,
    limit: number = 10,
    type?: WalletTransactionType,
  ) {
    const skip = (page - 1) * limit;
    const result = await this.walletRepository.getTransactions(userId, skip, limit, type);

    return {
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  /**
   * Request withdrawal
   */
  async requestWithdrawal(
    userId: string,
    amount: number,
    bankInfo: {
      bankName: string;
      accountNumber: string;
      accountName: string;
      branch?: string;
    },
    userNote?: string,
  ) {
    this.logger.log(`User ${userId} requesting withdrawal of ${amount}`);

    // Validate amount
    if (amount < this.MIN_WITHDRAWAL_AMOUNT) {
      throw new BadRequestException(
        `Số tiền rút tối thiểu là ${this.MIN_WITHDRAWAL_AMOUNT.toLocaleString()} VND`,
      );
    }

    // Check balance
    const balance = await this.getBalance(userId);
    if (balance < amount) {
      throw new BadRequestException(
        `Số dư không đủ. Số dư khả dụng: ${balance.toLocaleString()} VND, Số tiền yêu cầu: ${amount.toLocaleString()} VND`,
      );
    }

    // Validate bank info
    if (!bankInfo.bankName || !bankInfo.accountNumber || !bankInfo.accountName) {
      throw new BadRequestException('Thông tin ngân hàng là bắt buộc: Tên ngân hàng, Số tài khoản, Tên chủ tài khoản');
    }

    // Create withdrawal request
    const withdrawal = await this.withdrawalRepository.create({
      userId,
      amount,
      bankInfo,
      userNote,
    });

    this.logger.log(`Withdrawal request created: ${withdrawal.id}`);

    return withdrawal;
  }

  /**
   * Admin: Get all withdrawal requests
   */
  async getAllWithdrawals(
    page: number = 1,
    limit: number = 10,
    status?: WithdrawalStatus,
    userId?: string,
  ) {
    const skip = (page - 1) * limit;
    const result = await this.withdrawalRepository.findAll(skip, limit, {
      status,
      userId,
    });

    return {
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  /**
   * Admin: Approve withdrawal (mark as processing)
   */
  async approveWithdrawal(withdrawalId: string, adminId: string, adminNote?: string) {
    this.logger.log(`Admin ${adminId} approving withdrawal ${withdrawalId}`);

    const withdrawal = await this.withdrawalRepository.findById(withdrawalId);
    if (!withdrawal) {
      throw new BadRequestException('Không tìm thấy yêu cầu rút tiền');
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(`Không thể duyệt yêu cầu rút tiền với trạng thái: ${withdrawal.status}`);
    }

    // Update status to PROCESSING
    const updated = await this.withdrawalRepository.updateStatus(
      withdrawalId,
      WithdrawalStatus.PROCESSING,
      adminId,
      adminNote,
    );

    // Send email notification for withdrawal approved
    try {
      const user = await this.userRepository.findById(withdrawal.userId);
      if (user) {
        const bankInfo = withdrawal.bankInfo as any;
        const emailSent = await this.emailService.sendWithdrawalApprovedEmail(user.email.value, {
          username: user.username,
          amount: Number(withdrawal.amount),
          bankName: bankInfo?.bankName || '',
          accountNumber: bankInfo?.accountNumber || '',
          approvedAt: new Date(),
        });

        if (emailSent) {
          this.logger.log(`✅ Sent withdrawal approved email to ${user.email.value}`);
        } else {
          this.logger.warn(`⚠️ Failed to send withdrawal approved email (SMTP blocked). Withdrawal approved successfully.`);
        }
      }
    } catch (error) {
      this.logger.error(`Unexpected error in email sending:`, error);
      // Don't fail the request if email fails
    }

    return updated;
  }

  /**
   * Admin: Complete withdrawal (mark as completed and deduct from wallet)
   * SIMPLIFIED: Allow complete directly from PENDING (skip PROCESSING)
   */
  async completeWithdrawal(withdrawalId: string, adminId: string, adminNote?: string) {
    this.logger.log(`Admin ${adminId} completing withdrawal ${withdrawalId}`);

    const withdrawal = await this.withdrawalRepository.findById(withdrawalId);
    if (!withdrawal) {
      throw new BadRequestException('Không tìm thấy yêu cầu rút tiền');
    }

    // SIMPLIFIED: Allow complete from PENDING or PROCESSING
    if (withdrawal.status !== WithdrawalStatus.PENDING && withdrawal.status !== WithdrawalStatus.PROCESSING) {
      throw new BadRequestException(
        `Không thể hoàn thành yêu cầu rút tiền với trạng thái: ${withdrawal.status}`,
      );
    }

    // Deduct from wallet
    await this.walletRepository.addTransaction({
      userId: withdrawal.userId,
      type: WalletTransactionType.WITHDRAWAL,
      amount: -Number(withdrawal.amount), // Negative to deduct
      withdrawalId,
      description: `Withdrawal completed: ${withdrawal.amount.toLocaleString()} VND`,
    });

    // Update withdrawal status to COMPLETED
    const completed = await this.withdrawalRepository.updateStatus(
      withdrawalId,
      WithdrawalStatus.COMPLETED,
      adminId,
      adminNote,
    );

    this.logger.log(`Withdrawal ${withdrawalId} completed. Deducted ${withdrawal.amount} from wallet`);

    // Send email notification for withdrawal completed
    try {
      const user = await this.userRepository.findById(withdrawal.userId);
      if (user) {
        const bankInfo = withdrawal.bankInfo as any;
        const emailSent = await this.emailService.sendWithdrawalCompletedEmail(user.email.value, {
          username: user.username,
          amount: Number(withdrawal.amount),
          bankName: bankInfo?.bankName || '',
          accountNumber: bankInfo?.accountNumber || '',
          completedAt: new Date(),
        });

        if (emailSent) {
          this.logger.log(`✅ Sent withdrawal completed email to ${user.email.value}`);
        } else {
          this.logger.warn(`⚠️ Failed to send withdrawal completed email (SMTP blocked). Withdrawal completed successfully.`);
        }
      }
    } catch (error) {
      this.logger.error(`Unexpected error in email sending:`, error);
      // Don't fail the request if email fails
    }

    return completed;
  }

  /**
   * Admin: Reject withdrawal
   */
  async rejectWithdrawal(
    withdrawalId: string,
    adminId: string,
    rejectReason: string,
    adminNote?: string,
  ) {
    this.logger.log(`Admin ${adminId} rejecting withdrawal ${withdrawalId}`);

    const withdrawal = await this.withdrawalRepository.findById(withdrawalId);
    if (!withdrawal) {
      throw new BadRequestException('Không tìm thấy yêu cầu rút tiền');
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(`Không thể từ chối yêu cầu rút tiền với trạng thái: ${withdrawal.status}`);
    }

    if (!rejectReason) {
      throw new BadRequestException('Lý do từ chối là bắt buộc');
    }

    return this.withdrawalRepository.updateStatus(
      withdrawalId,
      WithdrawalStatus.REJECTED,
      adminId,
      adminNote,
      rejectReason,
    );
  }

  /**
   * Get withdrawal history for a user
   */
  async getWithdrawalHistory(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const result = await this.withdrawalRepository.findByUserId(userId, skip, limit);

    return {
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  /**
   * Admin: Get wallets with negative balance (for warning)
   */
  async getNegativeBalanceWallets() {
    return this.walletRepository.findNegativeBalances();
  }

  /**
   * Admin: Get wallet statistics
   */
  async getWalletStats() {
    return this.walletRepository.getTotalBalances();
  }

  /**
   * Admin: Get top users by wallet balance
   */
  async getTopBalanceUsers(limit: number = 10) {
    return this.walletRepository.getTopBalanceUsers(limit);
  }

  /**
   * Admin: Manual balance adjustment
   */
  async adminAdjustBalance(
    userId: string,
    amount: number,
    description: string,
    adminId: string,
  ) {
    this.logger.log(`Admin ${adminId} adjusting balance for user ${userId}: ${amount}`);

    return this.walletRepository.adminAdjustBalance(userId, amount, description, adminId);
  }
}
