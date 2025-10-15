import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { BankTransactionRepository } from '@infrastructure/database/repositories/bank-transaction.repository';
import { OrderRepository } from '@infrastructure/database/repositories/order.repository';
import { NotificationRepository } from '@infrastructure/database/repositories/notification.repository';
import { PaymentStatus, NotificationType } from '@prisma/client';

/**
 * PAYMENT SERVICE
 * 
 * Handles:
 * - Processing SePay webhooks
 * - Matching transactions with orders
 * - Updating payment status
 * - Creating notifications
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly bankTransactionRepository: BankTransactionRepository,
    private readonly orderRepository: OrderRepository,
    private readonly notificationRepository: NotificationRepository,
  ) {}

  /**
   * Process webhook from SePay
   * Reference: https://sepay.vn/lap-trinh-cong-thanh-toan.html
   * 
   * Supports both:
   * - Regular bank account with transaction content matching
   * - Virtual Account (VA) with automatic matching via sub_account
   */
  async processWebhook(webhookData: any): Promise<{
    success: boolean;
    message: string;
    transaction?: any;
    order?: any;
  }> {
    try {
      this.logger.log(`Processing SePay webhook: ${JSON.stringify(webhookData)}`);

      // Check if transaction already exists
      if (webhookData.id) {
        const existing = await this.bankTransactionRepository.findBySepayId(webhookData.id);
        if (existing) {
          this.logger.warn(`Transaction ${webhookData.id} already processed`);
          return {
            success: true,
            message: 'Transaction already processed',
            transaction: existing,
          };
        }
      }

      // Extract transaction info
      const transactionDate = new Date(webhookData.transaction_date || webhookData.transactionDate);
      const transactionContent = webhookData.transaction_content || webhookData.transactionContent || '';
      const subAccount = webhookData.sub_account || webhookData.subAccount || '';
      const amountIn = parseFloat(webhookData.amount_in || webhookData.amountIn || 0);
      
      // Only process incoming transactions (amountIn > 0)
      if (amountIn <= 0) {
        this.logger.warn(`Ignoring outgoing transaction or zero amount`);
        return {
          success: false,
          message: 'Not an incoming transaction',
        };
      }

      // Create bank transaction record
      const bankTransaction = await this.bankTransactionRepository.create({
        sepayTransactionId: webhookData.id,
        gateway: webhookData.gateway || 'UNKNOWN',
        transactionDate,
        accountNumber: webhookData.account_number || webhookData.accountNumber || '',
        subAccount: subAccount,
        amountIn,
        amountOut: parseFloat(webhookData.amount_out || webhookData.amountOut || 0),
        accumulated: parseFloat(webhookData.accumulated || 0),
        code: webhookData.code,
        transactionContent,
        referenceNumber: webhookData.reference_number || webhookData.referenceNumber,
        body: JSON.stringify(webhookData),
      });

      this.logger.log(`Bank transaction created: ${bankTransaction.id}`);
      this.logger.log(`Sub Account (VA): ${subAccount}`);
      this.logger.log(`Transaction Content: ${transactionContent}`);

      // Try to match with order
      const matchResult = await this.matchTransactionWithOrder(bankTransaction);

      return {
        success: true,
        message: matchResult.matched ? 'Transaction matched and processed' : 'Transaction saved but not matched',
        transaction: bankTransaction,
        order: matchResult.order,
      };
    } catch (error) {
      this.logger.error(`Failed to process webhook:`, error);
      throw error;
    }
  }

  /**
   * Match a bank transaction with an order based on transaction content
   */
  async matchTransactionWithOrder(bankTransaction: any): Promise<{
    matched: boolean;
    order?: any;
    message: string;
  }> {
    try {
      const content = bankTransaction.transactionContent.toUpperCase();
      this.logger.log(`Attempting to match transaction content: "${content}"`);

      // Extract order code from transaction content
      // Common formats: "ORD123456", "ORDER123456", "DH123456", etc.
      const orderCodePattern = /(?:ORD|ORDER|DH)[\-\s]?(\d{6,})/i;
      const match = content.match(orderCodePattern);

      if (!match) {
        this.logger.warn(`No order code found in transaction content: "${content}"`);
        return {
          matched: false,
          message: 'No order code found in transaction content',
        };
      }

      const extractedCode = match[0].replace(/[\-\s]/g, ''); // Remove hyphens and spaces
      this.logger.log(`Extracted order code: "${extractedCode}"`);

      // Find order by order number
      const order = await this.orderRepository.findByOrderNumber(extractedCode);

      if (!order) {
        this.logger.warn(`Order not found for code: "${extractedCode}"`);
        return {
          matched: false,
          message: `Order not found for code: ${extractedCode}`,
        };
      }

      // Check if order amount matches transaction amount (with 1% tolerance)
      const orderAmount = Number(order.totalAmount);
      const transactionAmount = Number(bankTransaction.amountIn);
      const tolerance = orderAmount * 0.01; // 1% tolerance

      if (Math.abs(orderAmount - transactionAmount) > tolerance) {
        this.logger.warn(
          `Amount mismatch - Order: ${orderAmount}, Transaction: ${transactionAmount}`,
        );
        // Still link but don't auto-approve
        await this.bankTransactionRepository.markAsProcessed(bankTransaction.id, order.id);
        return {
          matched: false,
          order,
          message: 'Amount mismatch - requires manual review',
        };
      }

      // Update order payment status
      await this.orderRepository.updatePaymentStatus(order.id, PaymentStatus.COMPLETED);

      // Mark transaction as processed
      await this.bankTransactionRepository.markAsProcessed(bankTransaction.id, order.id);

      // Create notification for user
      await this.notificationRepository.create({
        userId: order.userId,
        type: NotificationType.PAYMENT_RECEIVED,
        title: 'Thanh toán thành công',
        message: `Đơn hàng ${order.orderNumber} đã được thanh toán thành công. Số tiền: ${transactionAmount.toLocaleString('vi-VN')} VNĐ`,
        actionUrl: `/orders/${order.id}`,
        actionText: 'Xem đơn hàng',
        metadata: {
          orderId: order.id,
          transactionId: bankTransaction.id,
          amount: transactionAmount,
        },
      });

      this.logger.log(`✅ Order ${order.orderNumber} payment confirmed`);

      return {
        matched: true,
        order,
        message: 'Payment confirmed successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to match transaction:`, error);
      throw error;
    }
  }

  /**
   * Get payment info for an order (for displaying QR code)
   */
  async getPaymentInfo(orderId: string) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Number(order.totalAmount),
      paymentStatus: order.paymentStatus,
      // Bank account info should come from environment variables
      // Will be used to generate VietQR
      bankAccount: {
        accountNumber: process.env.BANK_ACCOUNT_NUMBER || '',
        accountName: process.env.BANK_ACCOUNT_NAME || '',
        bankCode: process.env.BANK_CODE || 'BIDV',
        bankName: process.env.BANK_NAME || 'BIDV',
      },
      description: order.orderNumber, // This will be the transfer content
    };
  }

  /**
   * Check payment status of an order
   */
  async checkPaymentStatus(orderId: string) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    const transactions = await this.bankTransactionRepository.findByOrderId(orderId);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      paidAt: order.paidAt,
      transactions: transactions.map(tx => ({
        id: tx.id,
        gateway: tx.gateway,
        amount: Number(tx.amountIn),
        transactionDate: tx.transactionDate,
        referenceNumber: tx.referenceNumber,
      })),
    };
  }

  /**
   * Get all bank transactions (admin)
   */
  async getAllTransactions(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const result = await this.bankTransactionRepository.findAll(skip, limit);

    return {
      data: result.data.map(tx => ({
        ...tx,
        amountIn: Number(tx.amountIn),
        amountOut: Number(tx.amountOut),
        accumulated: Number(tx.accumulated),
      })),
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }
}

