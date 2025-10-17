import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PendingOrderService } from './pending-order.service';

/**
 * PENDING ORDER CLEANUP SERVICE
 *
 * Purpose: Auto-expire pending orders that haven't been paid within 30 minutes
 *
 * Schedule: Runs every 5 minutes
 *
 * Setup:
 * 1. Install: npm install @nestjs/schedule
 * 2. Import ScheduleModule in app.module.ts
 * 3. Uncomment @Cron decorator below
 */
@Injectable()
export class PendingOrderCleanupService {
  private readonly logger = new Logger(PendingOrderCleanupService.name);

  constructor(private readonly pendingOrderService: PendingOrderService) {}

  /**
   * Cleanup expired pending orders
   * Runs every 5 minutes
   *
   * ✅ ENABLED: @nestjs/schedule installed and configured
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredPendingOrders() {
    this.logger.log('🔍 Running scheduled cleanup for expired pending orders...');

    try {
      await this.pendingOrderService.cleanupExpiredPendingOrders();
      this.logger.log('✅ Scheduled cleanup completed');
    } catch (error) {
      this.logger.error('❌ Failed to cleanup expired pending orders:', error);
    }
  }

  /**
   * Manual trigger for testing
   * Can be called via admin endpoint
   */
  async manualCleanup() {
    this.logger.log('🔧 Manual cleanup triggered...');
    await this.pendingOrderService.cleanupExpiredPendingOrders();
  }
}
