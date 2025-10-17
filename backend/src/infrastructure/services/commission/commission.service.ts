import { Injectable, Logger } from '@nestjs/common';
import { CommissionRepository } from '@infrastructure/database/repositories/commission.repository';
import { WalletRepository } from '@infrastructure/database/repositories/wallet.repository';
import { UserRepository } from '@infrastructure/database/repositories/user.repository';
import { CommissionStatus, WalletTransactionType } from '@prisma/client';
import { EmailService } from '../email/email.service';

/**
 * COMMISSION CALCULATION SERVICE
 *
 * Business Logic:
 * - Level 1 (Direct Upline): 10%
 * - Level 2 (2nd Upline): 4%
 * - Level 3 (3rd Upline): 2%
 * - Level 4+: 0%
 *
 * Flow:
 * 1. Order COMPLETED → Calculate & add to wallet
 * 2. Order CANCELLED → Refund from wallet
 */
@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  // Commission rates by level
  private readonly COMMISSION_RATES: Record<number, number> = {
    1: 10.0,  // Direct upline: 10%
    2: 4.0,   // 2nd level upline: 4%
    3: 2.0,   // 3rd level upline: 2%
  };

  constructor(
    private readonly commissionRepository: CommissionRepository,
    private readonly walletRepository: WalletRepository,
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Calculate and distribute commissions when order is completed
   * @param orderId Order ID
   * @param buyerUserId User who made the purchase
   * @param orderValue Total order value
   * @param orderNumber Order number for email notification
   */
  async calculateCommissionsForOrder(
    orderId: string,
    buyerUserId: string,
    orderValue: number,
    orderNumber?: string,
  ): Promise<void> {
    this.logger.log(`Calculating commissions for order ${orderId}, buyer: ${buyerUserId}, value: ${orderValue}`);

    try {
      // 🛡️ CRITICAL: Check if commissions EVER existed for this order (including CANCELLED)
      // This prevents double-payment attacks via state transitions
      const existingCommissions = await this.commissionRepository.findByOrderId(orderId);

      if (existingCommissions.length > 0) {
        const commissionIds = existingCommissions.map(c => c.id).join(', ');
        const statuses = existingCommissions.map(c => c.status).join(', ');

        this.logger.error(
          `⛔ BLOCKED: Order ${orderId} already has ${existingCommissions.length} commission record(s)! ` +
          `Commission IDs: [${commissionIds}], Statuses: [${statuses}]. ` +
          `This prevents double-payment from multiple COMPLETED transitions.`
        );

        // Throw error instead of silently returning to catch bugs in calling code
        throw new Error(
          `Commission calculation blocked: Order ${orderId} already has commission records. ` +
          `Cannot recalculate to prevent double-payment.`
        );
      }

      // Get upline chain (max 3 levels)
      const uplineChain = await this.userRepository.findUplineChain(buyerUserId, 3);

      if (uplineChain.length === 0) {
        this.logger.log(`No upline found for user ${buyerUserId}. No commissions to distribute.`);
        return;
      }

      this.logger.log(`Found ${uplineChain.length} upline(s) for user ${buyerUserId}`);

      // Get current period (YYYY-MM)
      const period = this.getCurrentPeriod();

      // Calculate commission for each upline level
      const commissions = [];
      for (let level = 1; level <= uplineChain.length && level <= 3; level++) {
        const uplineUser = uplineChain[level - 1];
        const rate = this.COMMISSION_RATES[level] || 0;

        if (rate === 0) continue;

        const commissionAmount = (orderValue * rate) / 100;

        this.logger.log(
          `Level ${level}: User ${uplineUser.username} (${uplineUser.id}) receives ${commissionAmount} (${rate}%)`,
        );

        // Create commission record with error handling for unique constraint
        let commission;
        try {
          commission = await this.commissionRepository.create({
            userId: uplineUser.id,
            orderId,
            fromUserId: buyerUserId,
            level,
            orderValue,
            commissionRate: rate,
            commissionAmount,
            period,
            status: CommissionStatus.APPROVED, // Auto approved
          });
        } catch (error: any) {
          // Catch database unique constraint violation (last line of defense)
          if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
            this.logger.error(
              `⛔ DATABASE BLOCKED: Duplicate commission detected by unique constraint! ` +
              `Order: ${orderId}, User: ${uplineUser.id}, Level: ${level}. ` +
              `This should never happen if application logic is correct!`
            );
            throw new Error(
              `Duplicate commission blocked by database constraint. ` +
              `Order: ${orderId}, User: ${uplineUser.id}, Level: ${level}`
            );
          }
          // Re-throw other errors
          throw error;
        }

        commissions.push(commission);

        // Add to wallet immediately
        await this.walletRepository.addTransaction({
          userId: uplineUser.id,
          type: WalletTransactionType.COMMISSION_EARNED,
          amount: commissionAmount,
          orderId,
          commissionId: commission.id,
          description: `Commission from order ${orderId} (Level ${level}, ${rate}%)`,
        });

        this.logger.log(`✅ Added ${commissionAmount} to wallet of user ${uplineUser.id}`);

        // Send email notification for commission earned
        try {
          const buyerUser = await this.userRepository.findById(buyerUserId);

          if (buyerUser && orderNumber) {
            await this.emailService.sendCommissionEarnedEmail(uplineUser.email.value, {
              username: uplineUser.username,
              amount: commissionAmount,
              orderNumber: orderNumber,
              level,
              fromUser: buyerUser.username,
              earnedAt: new Date(),
            });

            this.logger.log(`✅ Sent commission earned email to ${uplineUser.email.value}`);
          }
        } catch (error) {
          this.logger.error(`Failed to send commission earned email:`, error);
          // Don't fail the request if email fails
        }
      }

      this.logger.log(`Successfully calculated ${commissions.length} commissions for order ${orderId}`);
    } catch (error) {
      this.logger.error(`Failed to calculate commissions for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Refund commissions when order is cancelled
   * @param orderId Order ID
   */
  async refundCommissionsForOrder(orderId: string): Promise<void> {
    this.logger.log(`Refunding commissions for cancelled order ${orderId}`);

    try {
      // Find all commissions for this order
      const commissions = await this.commissionRepository.findByOrderId(orderId);

      if (commissions.length === 0) {
        this.logger.log(`No commissions found for order ${orderId}`);
        return;
      }

      this.logger.log(`Found ${commissions.length} commission(s) to check for refund`);

      // ✅ FIX: Only refund commissions that are NOT already CANCELLED
      const commissionsToRefund = commissions.filter(
        (c) => c.status !== CommissionStatus.CANCELLED
      );

      if (commissionsToRefund.length === 0) {
        this.logger.log(`All commissions for order ${orderId} are already refunded. Skipping.`);
        return;
      }

      this.logger.log(`Refunding ${commissionsToRefund.length} commission(s)`);

      for (const commission of commissionsToRefund) {
        // Update commission status to CANCELLED
        await this.commissionRepository.updateStatus(
          commission.id,
          CommissionStatus.CANCELLED,
          'Order cancelled - commission refunded',
        );

        // Deduct from wallet (negative amount)
        // ⚠️ This CAN make wallet negative if user already withdrew
        // This is INTENTIONAL - business logic to prevent fraud
        await this.walletRepository.addTransaction({
          userId: commission.userId,
          type: WalletTransactionType.COMMISSION_REFUND,
          amount: -Number(commission.commissionAmount), // Negative to deduct
          orderId,
          commissionId: commission.id,
          description: `Commission refund for cancelled order ${orderId}`,
        });

        this.logger.log(
          `✅ Refunded ${commission.commissionAmount} from wallet of user ${commission.userId}`,
        );
      }

      this.logger.log(
        `✅ Commission refund completed for order ${orderId}: ${commissionsToRefund.length} commission(s) refunded`
      );
    } catch (error) {
      this.logger.error(`Failed to refund commissions for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get current period in YYYY-MM format
   */
  private getCurrentPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Get commission summary for a user
   */
  async getCommissionSummary(userId: string) {
    return this.commissionRepository.getSummary(userId);
  }

  /**
   * Get commission statistics
   */
  async getCommissionStats(userId?: string, fromDate?: Date, toDate?: Date) {
    return this.commissionRepository.getStats(userId, fromDate, toDate);
  }
}
