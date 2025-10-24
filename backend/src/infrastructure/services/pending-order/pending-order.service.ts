import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PendingOrderRepository } from '@infrastructure/database/repositories/pending-order.repository';
import { CartRepository } from '@infrastructure/database/repositories/cart.repository';
import { ProductRepository } from '@infrastructure/database/repositories/product.repository';
import { UserRepository } from '@infrastructure/database/repositories/user.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PendingOrderStatus } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { PricingService } from '../pricing/pricing.service';

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
    private readonly pricingService: PricingService,
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
    freeGifts?: Array<{
      productId: string;
      variantId: string;
      quantity: number;
    }>;
  }) {
    this.logger.log(`Creating pending order for user ${data.userId}`);

    // 1. Get cart with items
    const cart = await this.cartRepository.getCartByUserId(data.userId);
    if (!cart || cart.items.length === 0) {
      throw new NotFoundException('Giỏ hàng trống');
    }

    // 2. Validate stock and calculate pricing
    const itemsWithPricing = [];
    const normalItems: Array<{ cartItem: any; product: any; variant: any; size: '5ml' | '20ml' }> = [];
    let specialProductsTotal = 0;

    // First pass: separate special products and collect normal products
    for (const cartItem of cart.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: cartItem.productId },
      });
      if (!product) {
        throw new NotFoundException(`Product ${cartItem.productId} not found`);
      }

      const variantId = cartItem.productVariantId;

      // Special product - use fixed price
      if (product.isSpecial) {
        // Check stock
        const productStock = product.stock || 0;
        if (productStock < cartItem.quantity) {
          throw new Error(
            `Sản phẩm "${product.name}" không đủ hàng (còn ${productStock})`,
          );
        }

        // Get price from product first, then fallback to variant
        let effectivePrice = Number(product.salePrice || product.price || 0);
        
        // If product has no price, try to get from variant
        if (effectivePrice === 0 && variantId) {
          const variant = await this.prisma.productVariant.findUnique({
            where: { id: variantId },
          });
          if (variant) {
            effectivePrice = Number(variant.salePrice || variant.price || 0);
          }
        }
        
        // If still no price, try to get from any variant of this product
        if (effectivePrice === 0) {
          const anyVariant = await this.prisma.productVariant.findFirst({
            where: { productId: product.id },
          });
          if (anyVariant) {
            effectivePrice = Number(anyVariant.salePrice || anyVariant.price || 0);
          }
        }

        const itemSubtotal = effectivePrice * cartItem.quantity;

        this.logger.log(`[Special Product] ${product.name}: price=${effectivePrice}, qty=${cartItem.quantity}, subtotal=${itemSubtotal}`);

        itemsWithPricing.push({
          productId: cartItem.productId,
          productVariantId: variantId || null,
          productName: product.name,
          variantSize: null,
          sku: product.sku,
          quantity: cartItem.quantity,
          price: effectivePrice,
          subtotal: itemSubtotal,
        });

        specialProductsTotal += itemSubtotal;
      } else if (variantId) {
        // Normal product with variant - collect for batch pricing
        const variant = await this.prisma.productVariant.findUnique({
          where: { id: variantId },
        });
        if (!variant) {
          throw new NotFoundException(`Product variant ${variantId} not found`);
        }

        // Check stock (unlimited for now)
        // if (variant.stock < cartItem.quantity) {
        //   throw new Error(
        //     `Sản phẩm "${product.name} - ${variant.size}" không đủ hàng (còn ${variant.stock})`,
        //   );
        // }

        const size = variant.size as '5ml' | '20ml';
        if (size !== '5ml' && size !== '20ml') {
          throw new Error(`Invalid variant size: ${size}`);
        }

        normalItems.push({ cartItem, product, variant, size });
      } else {
        throw new Error(`Product ${product.name} has no variant`);
      }
    }

    // Second pass: calculate pricing for normal products (grouped by size)
    // This ensures all 5ml products get the same tier price based on TOTAL 5ml quantity
    let normalProductsTotal = 0;
    
    if (normalItems.length > 0) {
      const itemsForPricing = normalItems.map(({ cartItem, size }) => ({
        quantity: cartItem.quantity,
        size
      }));

      const { priceBreakdownBySize } = await this.pricingService.calculatePriceForItems(itemsForPricing);

      // Calculate total quantity per size to get the correct proportional price
      const totalQuantityBySize = new Map<'5ml' | '20ml', number>();
      for (const { cartItem, size } of normalItems) {
        const current = totalQuantityBySize.get(size) || 0;
        totalQuantityBySize.set(size, current + cartItem.quantity);
      }

      // Apply calculated pricing to each normal item proportionally
      for (const { cartItem, product, variant, size } of normalItems) {
        const breakdown = priceBreakdownBySize.get(size);
        if (!breakdown) {
          throw new Error(`No pricing breakdown for size ${size}`);
        }

        // Calculate proportional price for this item
        // breakdown.totalPrice is for ALL items of this size
        // We need to calculate the proportion for this specific item
        const totalQty = totalQuantityBySize.get(size) || 1;
        const itemProportion = cartItem.quantity / totalQty;
        const itemSubtotal = breakdown.totalPrice * itemProportion;
        const itemPricePerUnit = itemSubtotal / cartItem.quantity;

        this.logger.log(`[Normal Product] ${product.name} (${size}): qty=${cartItem.quantity}, total_${size}=${totalQty}, tier=${breakdown.appliedRange}, price_per_unit=${itemPricePerUnit.toFixed(0)}, subtotal=${itemSubtotal.toFixed(0)}`);

        itemsWithPricing.push({
          productId: cartItem.productId,
          productVariantId: variant.id,
          productName: product.name,
          variantSize: variant.size,
          sku: variant.sku,
          quantity: cartItem.quantity,
          price: Math.round(itemPricePerUnit),
          subtotal: Math.round(itemSubtotal),
          priceBreakdown: breakdown,
        });

        normalProductsTotal += itemSubtotal;
      }
    }

    // Process free gifts (price = 0, no quota count)
    if (data.freeGifts && data.freeGifts.length > 0) {
      this.logger.log(`Processing ${data.freeGifts.length} free gift items`);

      for (const freeGift of data.freeGifts) {
        const product = await this.prisma.product.findUnique({
          where: { id: freeGift.productId },
        });

        if (!product) {
          this.logger.warn(`Free gift product ${freeGift.productId} not found, skipping`);
          continue;
        }

        const variant = await this.prisma.productVariant.findUnique({
          where: { id: freeGift.variantId },
        });

        if (!variant) {
          this.logger.warn(`Free gift variant ${freeGift.variantId} not found, skipping`);
          continue;
        }

        this.logger.log(`[Free Gift] ${product.name} (${variant.size}): qty=${freeGift.quantity}, price=0`);

        itemsWithPricing.push({
          productId: freeGift.productId,
          productVariantId: freeGift.variantId,
          productName: product.name,
          variantSize: variant.size,
          sku: variant.sku,
          quantity: freeGift.quantity,
          price: 0, // Free gift - price is 0
          subtotal: 0, // Free gift - subtotal is 0
          isFreeGift: true, // Mark as free gift
        });
      }
    }

    const subtotal = specialProductsTotal + normalProductsTotal; // Free gifts don't count toward subtotal

    this.logger.log(`[Pricing Summary] Special: ${specialProductsTotal}, Normal: ${normalProductsTotal}, Free Gifts: ${data.freeGifts?.length || 0}, Total: ${subtotal}`);

    // 3. Calculate shipping fee (you can add logic based on address, weight, etc.)
    const shippingFee = 0; // Free shipping for now

    // 4. Calculate total
    const totalAmount = subtotal + shippingFee;

    // 🔍 DEBUG: Log pricing calculation
    this.logger.log(`[createPendingOrderFromCart] Pricing calculation:`);
    this.logger.log(`  - Subtotal: ${subtotal}`);
    this.logger.log(`  - Shipping Fee: ${shippingFee}`);
    this.logger.log(`  - Total Amount: ${totalAmount}`);
    this.logger.log(`  - Items count: ${itemsWithPricing.length}`);
    this.logger.log(`  - Items:`, JSON.stringify(itemsWithPricing, null, 2));

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

        const emailSent = await this.emailService.sendOrderCreatedEmail(user.email.value, {
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

        if (emailSent) {
          this.logger.log(`✅ Sent order created email to ${user.email.value}`);
        } else {
          this.logger.warn(`⚠️ Failed to send order created email (SMTP blocked). Order created successfully.`);
        }
      }
    } catch (error) {
      this.logger.error(`Unexpected error in email sending:`, error);
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
