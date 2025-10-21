import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { BankTransactionRepository } from '@infrastructure/database/repositories/bank-transaction.repository';
import { OrderRepository } from '@infrastructure/database/repositories/order.repository';
import { NotificationRepository } from '@infrastructure/database/repositories/notification.repository';
import { CartRepository } from '@infrastructure/database/repositories/cart.repository';
import { UserRepository } from '@infrastructure/database/repositories/user.repository';
import { PendingOrderRepository } from '@infrastructure/database/repositories/pending-order.repository';
import { PendingOrderService } from '@infrastructure/services/pending-order/pending-order.service';
import { PaymentStatus, NotificationType, PendingOrderStatus } from '@prisma/client';
import { UserRole } from '@shared/constants/user-roles.constant';
import { EmailService } from '../email/email.service';

/**
 * PAYMENT SERVICE
 *
 * Handles:
 * - Processing SePay webhooks
 * - Matching transactions with orders
 * - Updating payment status
 * - Clearing cart and updating quota after payment confirmation
 * - Creating notifications
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly bankTransactionRepository: BankTransactionRepository,
    private readonly orderRepository: OrderRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly cartRepository: CartRepository,
    private readonly userRepository: UserRepository,
    private readonly pendingOrderRepository: PendingOrderRepository,
    private readonly pendingOrderService: PendingOrderService,
    private readonly emailService: EmailService,
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
        // Convert id to string (Sepay sends as number, but DB stores as VARCHAR)
        const sepayId = String(webhookData.id);
        const existing = await this.bankTransactionRepository.findBySepayId(sepayId);
        if (existing) {
          this.logger.warn(`Transaction ${sepayId} already processed`);
          return {
            success: true,
            message: 'Transaction already processed',
            transaction: existing,
          };
        }
      }

      // Extract transaction info
      // Support multiple field name formats from Sepay
      const transactionDate = new Date(webhookData.transaction_date || webhookData.transactionDate || Date.now());
      const transactionContent = webhookData.transaction_content || webhookData.transactionContent || webhookData.content || webhookData.description || '';
      const subAccount = webhookData.sub_account || webhookData.subAccount || '';
      const amountIn = parseFloat(webhookData.amount_in || webhookData.amountIn || webhookData.transferAmount || 0);
      
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
        // Convert id to string (Sepay sends as number, but DB stores as VARCHAR)
        sepayTransactionId: webhookData.id ? String(webhookData.id) : undefined,
        gateway: webhookData.gateway || 'UNKNOWN',
        transactionDate,
        accountNumber: webhookData.account_number || webhookData.accountNumber || '',
        subAccount: subAccount,
        amountIn,
        amountOut: parseFloat(webhookData.amount_out || webhookData.amountOut || 0),
        accumulated: parseFloat(webhookData.accumulated || 0),
        code: webhookData.code,
        transactionContent,
        referenceNumber: webhookData.reference_number || webhookData.referenceNumber || webhookData.referenceCode || '',
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
   * Match a bank transaction with a PENDING ORDER and create real order
   * ✅ NEW FLOW: Matches with PendingOrder, not Order
   */
  async matchTransactionWithOrder(bankTransaction: any): Promise<{
    matched: boolean;
    order?: any;
    message: string;
  }> {
    try {
      const content = bankTransaction.transactionContent.toUpperCase();
      this.logger.log(`Attempting to match transaction content: "${content}"`);

      // Extract pending order code from transaction content
      // FORMATS:
      // - Direct VA (BIDV): "PD25XXXXXXXXX" or "LD25XXXXXXXXX"
      // - Indirect VA (TPBank): "TKPYRK PD25XXXXXXXXX" (prefix + VA + order code)
      // Pattern will match PD/LD followed by digits and alphanumeric chars
      const pendingOrderPattern = /(?:PD|LD)[\-\s]?(\d{2}[A-Z0-9]+)/i;
      const match = content.match(pendingOrderPattern);

      if (!match) {
        this.logger.warn(`No pending order code found in transaction content: "${content}"`);
        return {
          matched: false,
          message: 'No pending order code found in transaction content',
        };
      }

      const extractedCode = match[0].replace(/[\-\s]/g, ''); // Remove hyphens and spaces
      this.logger.log(`Extracted pending order code: "${extractedCode}"`);

      // Find pending order by pending number
      const pendingOrder = await this.pendingOrderRepository.findByPendingNumber(extractedCode);

      if (!pendingOrder) {
        this.logger.warn(`Pending order not found for code: "${extractedCode}"`);
        return {
          matched: false,
          message: `Pending order not found for code: ${extractedCode}`,
        };
      }

      // 🛡️ CRITICAL: Check if already paid (prevents duplicate webhook processing)
      if (pendingOrder.status === PendingOrderStatus.PAID) {
        this.logger.warn(
          `⛔ Pending order ${extractedCode} already paid (status: PAID). ` +
          `This is likely a duplicate webhook. Existing order: ${pendingOrder.orderId}`
        );

        // Return the existing order to acknowledge webhook
        if (pendingOrder.orderId) {
          const existingOrder = await this.orderRepository.findById(pendingOrder.orderId);
          return {
            matched: true, // Return true to acknowledge webhook
            order: existingOrder,
            message: 'Duplicate webhook - order already processed',
          };
        }

        return {
          matched: false,
          message: 'Pending order already converted to order',
        };
      }

      // Check if expired
      if (new Date() > pendingOrder.expiresAt) {
        this.logger.warn(`Pending order ${extractedCode} has expired`);
        await this.pendingOrderService.cancelPendingOrder(pendingOrder.id, 'EXPIRED');
        return {
          matched: false,
          message: 'Pending order expired',
        };
      }

      // Check if amount matches (with 1% tolerance)
      const pendingOrderAmount = Number(pendingOrder.totalAmount);
      const transactionAmount = Number(bankTransaction.amountIn);
      const tolerance = pendingOrderAmount * 0.01; // 1% tolerance

      if (Math.abs(pendingOrderAmount - transactionAmount) > tolerance) {
        this.logger.warn(
          `Amount mismatch - Pending Order: ${pendingOrderAmount}, Transaction: ${transactionAmount}`,
        );
        return {
          matched: false,
          message: 'Amount mismatch - requires manual review',
        };
      }

      // ✅ CREATE REAL ORDER FROM PENDING ORDER
      // Note: This entire flow should ideally be in a transaction, but due to complexity
      // we rely on the PAID status check above to prevent duplicates
      this.logger.log(`✅ Creating real order from pending order ${extractedCode}...`);

      const items = (pendingOrder.items as any[]).map((item) => ({
        productId: item.productId,
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        price: item.price,
      }));

      const order = await this.orderRepository.create({
        userId: pendingOrder.userId,
        items,
        subtotal: Number(pendingOrder.subtotal),
        shippingFee: Number(pendingOrder.shippingFee),
        totalAmount: Number(pendingOrder.totalAmount),
        shippingAddress: pendingOrder.shippingAddress,
        shippingMethod: pendingOrder.shippingMethod || undefined,
        paymentMethod: pendingOrder.paymentMethod || undefined,
        customerNote: pendingOrder.customerNote || undefined,
      });

      this.logger.log(`✅ Order ${order.orderNumber} created from pending order ${extractedCode}`);

      // Update order payment status to COMPLETED
      await this.orderRepository.updatePaymentStatus(order.id, PaymentStatus.COMPLETED);

      // Mark pending order as PAID and link to created order
      await this.pendingOrderService.markAsPaid(pendingOrder.id, order.id);

      // Mark transaction as processed
      await this.bankTransactionRepository.markAsProcessed(bankTransaction.id, order.id);

      // ✅ CLEAR CART - Now that payment is confirmed
      try {
        await this.cartRepository.clearCart(order.userId);
        this.logger.log(`✅ Cart cleared for user ${order.userId}`);
      } catch (error) {
        this.logger.error(`Failed to clear cart for user ${order.userId}:`, error);
      }

      // ✅ UPDATE QUOTA - Now that payment is confirmed
      // 🔧 FIX: Use atomic increment to prevent race condition
      try {
        const user = await this.userRepository.findById(order.userId);
        if (user && user.role !== UserRole.ADMIN) {
          const totalQuantity = order.items.reduce((sum: number, item: any) => sum + item.quantity, 0);

          // Use atomic increment instead of read-modify-write
          await this.userRepository.incrementQuota(order.userId, totalQuantity);

          this.logger.log(`✅ Quota updated for user ${order.userId}: +${totalQuantity}`);
        }
      } catch (error) {
        this.logger.error(`Failed to update quota for user ${order.userId}:`, error);
      }

      // Create notification for user
      await this.notificationRepository.create({
        userId: order.userId,
        type: NotificationType.PAYMENT_RECEIVED,
        title: 'Thanh toán thành công',
        message: `Đơn hàng ${order.orderNumber} đã được tạo và thanh toán thành công. Số tiền: ${transactionAmount.toLocaleString('vi-VN')} VNĐ`,
        actionUrl: `/orders/${order.id}`,
        actionText: 'Xem đơn hàng',
        metadata: {
          orderId: order.id,
          pendingOrderId: pendingOrder.id,
          transactionId: bankTransaction.id,
          amount: transactionAmount,
        },
      });

      this.logger.log(`✅ Order ${order.orderNumber} payment confirmed and fully processed`);

      // Send email notification for payment confirmation
      try {
        const user = await this.userRepository.findById(order.userId);
        if (user) {
          const emailSent = await this.emailService.sendOrderConfirmedEmail(user.email.value, {
            username: user.username,
            orderNumber: order.orderNumber,
            totalAmount: Number(order.totalAmount),
            paidAt: new Date(),
          });

          if (emailSent) {
            this.logger.log(`✅ Sent payment confirmation email to ${user.email.value}`);
          } else {
            this.logger.warn(`⚠️ Failed to send payment confirmation email (SMTP blocked). Payment confirmed successfully.`);
          }
        }
      } catch (error) {
        this.logger.error(`Unexpected error in email sending:`, error);
        // Don't fail the request if email fails
      }

      return {
        matched: true,
        order,
        message: 'Payment confirmed and order created successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to match transaction:`, error);
      throw error;
    }
  }

  /**
   * Get payment info for an order (for displaying QR code)
   * Supports both:
   * - Pending Order Number (PD25XXXXX) - before payment
   * - Order ID (UUID) - after payment confirmed
   */
  async getPaymentInfo(orderIdOrPendingNumber: string) {
    // Check if this is a pending order number (starts with PD or LD)
    const isPendingNumber = /^(PD|LD)[\-\s]?\d{2}[A-Z0-9]+$/i.test(orderIdOrPendingNumber);

    if (isPendingNumber) {
      // Find pending order
      const pendingOrder = await this.pendingOrderRepository.findByPendingNumber(orderIdOrPendingNumber);
      if (!pendingOrder) {
        throw new BadRequestException('Pending order not found');
      }

      // Check if expired
      if (new Date() > pendingOrder.expiresAt) {
        throw new BadRequestException('Pending order has expired. Please create a new order.');
      }

      // Check if already paid
      if (pendingOrder.status === PendingOrderStatus.PAID) {
        // If already paid, try to get the real order
        if (pendingOrder.orderId) {
          const order = await this.orderRepository.findById(pendingOrder.orderId);
          if (order) {
            // For direct account transfer: just use order number as description
            // SePay will hook directly to the main account
            return {
              orderId: order.id,
              orderNumber: order.orderNumber,
              amount: Number(order.totalAmount),
              paymentStatus: order.paymentStatus,
              bankAccount: {
                accountNumber: process.env.BANK_ACCOUNT_NUMBER || '',
                accountName: process.env.BANK_ACCOUNT_NAME || '',
                bankCode: process.env.BANK_CODE || 'TPBank',
                bankName: process.env.BANK_NAME || 'TPBank',
              },
              description: order.orderNumber, // Just order number for direct transfer
            };
          }
        }
      }

      // Return pending order payment info
      // For direct account transfer: just use order number as description
      // SePay will hook directly to the main account
      
      // 🔍 DEBUG: Log payment info
      const amount = Number(pendingOrder.totalAmount);
      this.logger.log(`[getPaymentInfo] Pending Order: ${pendingOrder.pendingNumber}`);
      this.logger.log(`  - totalAmount (raw): ${pendingOrder.totalAmount}`);
      this.logger.log(`  - amount (converted): ${amount}`);
      this.logger.log(`  - subtotal: ${pendingOrder.subtotal}`);
      this.logger.log(`  - shippingFee: ${pendingOrder.shippingFee}`);
      
      return {
        orderId: pendingOrder.id,
        orderNumber: pendingOrder.pendingNumber,
        amount,
        paymentStatus: 'PENDING',
        bankAccount: {
          accountNumber: process.env.BANK_ACCOUNT_NUMBER || '',
          accountName: process.env.BANK_ACCOUNT_NAME || '',
          bankCode: process.env.BANK_CODE || 'TPBank',
          bankName: process.env.BANK_NAME || 'TPBank',
        },
        description: pendingOrder.pendingNumber, // Just order number for direct transfer
      };
    }

    // Try to find real order by ID
    const order = await this.orderRepository.findById(orderIdOrPendingNumber);
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    // For direct account transfer: just use order number as description
    // SePay will hook directly to the main account
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Number(order.totalAmount),
      paymentStatus: order.paymentStatus,
      bankAccount: {
        accountNumber: process.env.BANK_ACCOUNT_NUMBER || '',
        accountName: process.env.BANK_ACCOUNT_NAME || '',
        bankCode: process.env.BANK_CODE || 'TPBank',
        bankName: process.env.BANK_NAME || 'TPBank',
      },
      description: order.orderNumber, // Just order number for direct transfer
    };
  }

  /**
   * Check payment status of an order
   * Supports both:
   * - Pending Order Number (PD25XXXXX) - before payment
   * - Order ID (UUID) - after payment confirmed
   */
  async checkPaymentStatus(orderIdOrPendingNumber: string) {
    // Check if this is a pending order number (starts with PD or LD)
    const isPendingNumber = /^(PD|LD)[\-\s]?\d{2}[A-Z0-9]+$/i.test(orderIdOrPendingNumber);

    if (isPendingNumber) {
      // Find pending order
      const pendingOrder = await this.pendingOrderRepository.findByPendingNumber(orderIdOrPendingNumber);
      if (!pendingOrder) {
        throw new BadRequestException('Pending order not found');
      }

      // If already paid and converted to real order
      if (pendingOrder.status === PendingOrderStatus.PAID && pendingOrder.orderId) {
        const order = await this.orderRepository.findById(pendingOrder.orderId);
        if (order) {
          const transactions = await this.bankTransactionRepository.findByOrderId(order.id);
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
      }

      // Return pending order status
      return {
        orderId: pendingOrder.id,
        orderNumber: pendingOrder.pendingNumber,
        paymentStatus: 'PENDING',
        paidAt: null,
        transactions: [],
      };
    }

    // Try to find real order by ID
    const order = await this.orderRepository.findById(orderIdOrPendingNumber);
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    const transactions = await this.bankTransactionRepository.findByOrderId(orderIdOrPendingNumber);

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

