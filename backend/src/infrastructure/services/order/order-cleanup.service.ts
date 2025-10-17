import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderRepository } from '@infrastructure/database/repositories/order.repository';
import { OrderStatus, PaymentStatus } from '@prisma/client';

/**
 * ORDER CLEANUP SERVICE
 *
 * Auto-cancels unpaid orders after 30 minutes
 * Runs every 5 minutes to check for expired orders
 */
@Injectable()
export class OrderCleanupService {
  private readonly logger = new Logger(OrderCleanupService.name);
  private readonly EXPIRY_MINUTES = 30;

  constructor(
    private readonly orderRepository: OrderRepository,
  ) {}

  /**
   * Scheduled job to cancel expired unpaid orders
   * Runs every 5 minutes
   *
   * ✅ ENABLED: @nestjs/schedule installed and configured
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cancelExpiredOrders() {
    this.logger.log('🔍 Checking for expired unpaid orders...');

    try {
      const now = new Date();
      const expiryTime = new Date(now.getTime() - this.EXPIRY_MINUTES * 60 * 1000);

      // Find all PENDING orders with PENDING payment that are older than 30 minutes
      const expiredOrders = await this.orderRepository.findExpiredOrders(
        OrderStatus.PENDING,
        PaymentStatus.PENDING,
        expiryTime,
      );

      if (expiredOrders.length === 0) {
        this.logger.log('✅ No expired orders found');
        return;
      }

      this.logger.log(`⚠️  Found ${expiredOrders.length} expired orders to cancel`);

      // Cancel each expired order
      for (const order of expiredOrders) {
        try {
          await this.orderRepository.updateStatus(order.id, OrderStatus.CANCELLED);
          this.logger.log(`✅ Cancelled expired order: ${order.orderNumber} (created: ${order.createdAt})`);
        } catch (error) {
          this.logger.error(`❌ Failed to cancel order ${order.orderNumber}:`, error);
        }
      }

      this.logger.log(`✅ Completed: Cancelled ${expiredOrders.length} expired orders`);
    } catch (error) {
      this.logger.error('❌ Failed to run order cleanup job:', error);
    }
  }

  /**
   * Manual trigger for testing
   * Can be called from a controller endpoint
   */
  async manualCleanup() {
    this.logger.log('🔧 Manual cleanup triggered');
    await this.cancelExpiredOrders();
  }
}
