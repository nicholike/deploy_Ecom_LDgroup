import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PendingOrderRepository } from '@infrastructure/database/repositories/pending-order.repository';
import { CartRepository } from '@infrastructure/database/repositories/cart.repository';
import { ProductRepository } from '@infrastructure/database/repositories/product.repository';
import { UserRepository } from '@infrastructure/database/repositories/user.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PendingOrderStatus } from '@prisma/client';
import { EmailService } from '../email/email.service';

/**
 * PENDING ORDER SERVICE
 *
 * Purpose: Create temporary pending orders before payment confirmation
 *
 * Flow:
 * 1. User clicks "Thanh toán" → Create PendingOrder (NOT Order)
 * 2. User goes to payment page
 * 3. User pays via SePay
 * 4. Webhook confirms payment → Convert PendingOrder to real Order
 * 5. If no payment within 30 minutes → Expire PendingOrder
 *
 * Benefits:
 * - Prevents quota bypass (users can't trick by creating pending orders)
 * - Cart only cleared AFTER payment
 * - Quota only updated AFTER payment
 */
@Injectable()
export class PendingOrderService {
  private readonly logger = new Logger(PendingOrderService.name);
  private readonly EXPIRY_MINUTES = 30;

  constructor(
    private readonly pendingOrderRepository: PendingOrderRepository,
    private readonly cartRepository: CartRepository,
    private readonly productRepository: ProductRepository,
    private readonly userRepository: UserRepository,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Create pending order from cart
   * This replaces the old createOrder endpoint
   */
  async createPendingOrderFromCart(data: {
    userId: string;
    shippingAddress?: any;
    shippingMethod?: string;
    paymentMethod?: string;
    customerNote?: string;
  }) {
    this.logger.log(`Creating pending order for user ${data.userId}`);

    // 1. Get cart with items
    const cart = await this.cartRepository.getCartByUserId(data.userId);
    if (!cart || cart.items.length === 0) {
      throw new NotFoundException('Giỏ hàng trống');
    }

    // 2. Validate stock and calculate pricing
    const itemsWithPricing = [];
    let subtotal = 0;

    for (const cartItem of cart.items) {
      const variantId = cartItem.productVariantId;

      if (!variantId) {
        throw new NotFoundException(`Product variant not found for cart item ${cartItem.id}`);
      }

      const variant = await this.prisma.productVariant.findUnique({
        where: { id: variantId },
        include: { product: true },
      });
      if (!variant) {
        throw new NotFoundException(`Product variant ${variantId} not found`);
      }

      // Check stock
      if (variant.stock < cartItem.quantity) {
        throw new Error(
          `Sản phẩm "${variant.product.name} - ${variant.size}" không đủ hàng (còn ${variant.stock})`,
        );
      }

      // Get effective price (sale price or regular price)
      const effectivePrice = Number(variant.salePrice || variant.price);
      const itemSubtotal = effectivePrice * cartItem.quantity;

      itemsWithPricing.push({
        productId: cartItem.productId,
        productVariantId: variantId,
        productName: variant.product.name,
        variantSize: variant.size,
        sku: variant.sku,
        quantity: cartItem.quantity,
        price: effectivePrice,
        subtotal: itemSubtotal,
      });

      subtotal += itemSubtotal;
    }

    // 3. Calculate shipping fee (you can add logic based on address, weight, etc.)
    const shippingFee = 0; // Free shipping for now

    // 4. Calculate total
    const totalAmount = subtotal + shippingFee;

    // 5. Set expiry time (30 minutes from now)
    const expiresAt = new Date(Date.now() + this.EXPIRY_MINUTES * 60 * 1000);

    // 6. Create pending order
    const pendingOrder = await this.pendingOrderRepository.create({
      userId: data.userId,
      items: itemsWithPricing, // Store as JSON snapshot
      subtotal,
      shippingFee,
      totalAmount,
      shippingAddress: data.shippingAddress,
      shippingMethod: data.shippingMethod,
      paymentMethod: data.paymentMethod,
      customerNote: data.customerNote,
      expiresAt,
    });

    this.logger.log(
      `✅ Created pending order ${pendingOrder.pendingNumber} for user ${data.userId}, expires at ${expiresAt.toISOString()}`,
    );

    // Send email notification for order created
    try {
      const user = await this.userRepository.findById(data.userId);
      if (user) {
        const shippingAddressText = typeof data.shippingAddress === 'string'
          ? data.shippingAddress
          : `${data.shippingAddress?.address || ''}, ${data.shippingAddress?.ward || ''}, ${data.shippingAddress?.district || ''}, ${data.shippingAddress?.province || ''}`;

        await this.emailService.sendOrderCreatedEmail(user.email.value, {
          username: user.username,
          orderNumber: pendingOrder.pendingNumber,
          totalAmount,
          items: itemsWithPricing.map(item => ({
            name: `${item.productName} - ${item.variantSize}`,
            quantity: item.quantity,
            price: item.subtotal,
          })),
          shippingAddress: shippingAddressText,
          createdAt: pendingOrder.createdAt,
        });

        this.logger.log(`✅ Sent order created email to ${user.email.value}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send order created email:`, error);
      // Don't fail the request if email fails
    }

    return pendingOrder;
  }

  /**
   * Get pending order by ID
   */
  async getPendingOrderById(id: string) {
    const pendingOrder = await this.pendingOrderRepository.findById(id);
    if (!pendingOrder) {
      throw new NotFoundException('Pending order not found');
    }
    return pendingOrder;
  }

  /**
   * Get pending order by pending number
   */
  async getPendingOrderByNumber(pendingNumber: string) {
    const pendingOrder = await this.pendingOrderRepository.findByPendingNumber(pendingNumber);
    if (!pendingOrder) {
      throw new NotFoundException('Pending order not found');
    }
    return pendingOrder;
  }

  /**
   * Cancel pending order (user cancelled or expired)
   */
  async cancelPendingOrder(id: string, reason: 'USER_CANCELLED' | 'EXPIRED') {
    this.logger.log(`Cancelling pending order ${id}, reason: ${reason}`);

    const pendingOrder = await this.pendingOrderRepository.findById(id);
    if (!pendingOrder) {
      throw new NotFoundException('Pending order not found');
    }

    if (pendingOrder.status !== PendingOrderStatus.AWAITING_PAYMENT) {
      throw new Error(`Cannot cancel pending order with status ${pendingOrder.status}`);
    }

    await this.pendingOrderRepository.updateStatus(
      id,
      PendingOrderStatus.CANCELLED,
      { cancelledAt: new Date() },
    );

    this.logger.log(`✅ Cancelled pending order ${pendingOrder.pendingNumber}`);
  }

  /**
   * Mark pending order as paid and link to created order
   * Called by PaymentService after webhook confirms payment
   */
  async markAsPaid(pendingOrderId: string, orderId: string) {
    this.logger.log(`Marking pending order ${pendingOrderId} as PAID, linked to order ${orderId}`);

    await this.pendingOrderRepository.updateStatus(
      pendingOrderId,
      PendingOrderStatus.PAID,
      {
        paidAt: new Date(),
        orderId,
      },
    );

    this.logger.log(`✅ Pending order ${pendingOrderId} marked as PAID`);
  }

  /**
   * Cleanup expired pending orders
   * Should be called by a scheduled job every 5 minutes
   */
  async cleanupExpiredPendingOrders() {
    this.logger.log('🔍 Checking for expired pending orders...');

    const now = new Date();
    const expiredOrders = await this.pendingOrderRepository.findExpired(now);

    if (expiredOrders.length === 0) {
      this.logger.log('No expired pending orders found');
      return;
    }

    this.logger.log(`Found ${expiredOrders.length} expired pending orders`);

    for (const pendingOrder of expiredOrders) {
      try {
        await this.cancelPendingOrder(pendingOrder.id, 'EXPIRED');
        this.logger.log(`✅ Expired pending order ${pendingOrder.pendingNumber}`);
      } catch (error) {
        this.logger.error(`Failed to expire pending order ${pendingOrder.id}:`, error);
      }
    }

    this.logger.log(`✅ Cleanup completed: ${expiredOrders.length} pending orders expired`);
  }

  /**
   * Get user's pending orders
   */
  async getUserPendingOrders(userId: string, skip: number = 0, take: number = 10) {
    return this.pendingOrderRepository.findByUserId(userId, skip, take);
  }
}
