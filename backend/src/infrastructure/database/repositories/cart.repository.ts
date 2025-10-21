import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PricingService } from '@infrastructure/services/pricing/pricing.service';
import { PriceBreakdown } from '@shared/utils/global-pricing.util';

export interface CartItemInput {
  productId: string;
  productVariantId?: string;
  quantity: number;
}

export interface CartWithPricing {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    productId: string;
    productVariantId: string | null;
    quantity: number;
    product: any;
    productVariant: any;
    priceBreakdown?: PriceBreakdown | null; // Null for special products
    specialPrice?: number; // For special products
  }>;
  totalPrice: number;
}

@Injectable()
export class CartRepository {
  constructor(
    private prisma: PrismaService,
    private pricingService: PricingService,
  ) {}

  async getCartByUserId(userId: string) {
    return this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                variants: true, // Include variants for special products
              },
            },
            productVariant: true,
          },
        },
      },
    });
  }

  async getOrCreateCart(userId: string) {
    let cart = await this.getCartByUserId(userId);
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  variants: true, // Include variants for special products
                },
              },
              productVariant: true,
            },
          },
        },
      });
    }
    return cart;
  }

  async addItem(userId: string, item: CartItemInput) {
    const cart = await this.getOrCreateCart(userId);

    // Check if item already exists
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: item.productId,
        productVariantId: item.productVariantId || null,
      },
    });

    if (existingItem) {
      // Update quantity
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + item.quantity },
        include: {
          product: true,
          productVariant: true,
        },
      });
    }

    // Create new item
    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: item.productId,
        productVariantId: item.productVariantId,
        quantity: item.quantity,
      },
      include: {
        product: true,
        productVariant: true,
      },
    });
  }

  async updateItemQuantity(userId: string, itemId: string, quantity: number) {
    const cart = await this.getCartByUserId(userId);
    if (!cart) throw new Error('Cart not found');

    console.log(`[CartRepository] updateItemQuantity - userId: ${userId}, itemId: ${itemId}, quantity: ${quantity}`);

    // Allow quantity = 0 (don't auto-remove)
    // Frontend will explicitly call removeItem when needed
    const result = await this.prisma.cartItem.update({
      where: {
        id: itemId,
        cartId: cart.id,
      },
      data: { quantity },
      include: {
        product: true,
        productVariant: true,
      },
    });

    console.log(`[CartRepository] Updated cart item - new quantity: ${result.quantity}`);

    return result;
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getCartByUserId(userId);
    if (!cart) throw new Error('Cart not found');

    return this.prisma.cartItem.delete({
      where: {
        id: itemId,
        cartId: cart.id,
      },
    });
  }

  async clearCart(userId: string) {
    const cart = await this.getCartByUserId(userId);
    if (!cart) return;

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return cart;
  }

  /**
   * Get cart with pricing calculations
   * - For normal products: calculate price using global pricing based on TOTAL quantity per size
   * - For special products: use product.price * quantity
   */
  async getCartWithPricing(userId: string): Promise<CartWithPricing | null> {
    const cart = await this.getCartByUserId(userId);
    if (!cart) return null;

    const itemsWithPricing = [];
    const normalItems: Array<{ item: any; size: '5ml' | '20ml' }> = [];
    let specialProductsTotal = 0;

    // First pass: separate special products and collect normal products
    for (const item of cart.items) {
      const product = item.product;
      const variant = item.productVariant;

      if (product.isSpecial) {
        // Special product - use fixed price
        let pricePerUnit = 0;

        if (variant) {
          pricePerUnit = Number(variant.salePrice || variant.price || 0);
        }

        if (pricePerUnit === 0 && product.variants && product.variants.length > 0) {
          const firstVariant = product.variants[0];
          pricePerUnit = Number(firstVariant.salePrice || firstVariant.price || 0);
        }

        if (pricePerUnit === 0) {
          pricePerUnit = Number(product.salePrice || product.price || 0);
        }

        const specialPrice = pricePerUnit * item.quantity;
        specialProductsTotal += specialPrice;

        itemsWithPricing.push({
          ...item,
          priceBreakdown: null,
          specialPrice,
        });
      } else {
        // Normal product - collect for batch pricing
        if (!variant || !variant.size) {
          console.warn(`Cart item ${item.id} has no variant or size`);
          itemsWithPricing.push({
            ...item,
            priceBreakdown: null,
            specialPrice: 0,
          });
          continue;
        }

        const size = variant.size as '5ml' | '20ml';
        if (size !== '5ml' && size !== '20ml') {
          console.warn(`Invalid size ${size} for cart item ${item.id}`);
          itemsWithPricing.push({
            ...item,
            priceBreakdown: null,
            specialPrice: 0,
          });
          continue;
        }

        normalItems.push({ item, size });
      }
    }

    // Second pass: calculate pricing for normal products (grouped by size)
    if (normalItems.length > 0) {
      const itemsForPricing = normalItems.map(({ item, size }) => ({
        quantity: item.quantity,
        size
      }));

      const { priceBreakdownBySize } = await this.pricingService.calculatePriceForItems(itemsForPricing);

      // Calculate total quantity per size to get the correct proportional price
      const totalQuantityBySize = new Map<'5ml' | '20ml', number>();
      for (const { item, size } of normalItems) {
        const current = totalQuantityBySize.get(size) || 0;
        totalQuantityBySize.set(size, current + item.quantity);
      }

      // Apply calculated pricing to each normal item proportionally
      for (const { item, size } of normalItems) {
        const breakdown = priceBreakdownBySize.get(size);
        if (!breakdown) {
          console.warn(`No pricing breakdown for size ${size}`);
          itemsWithPricing.push({
            ...item,
            priceBreakdown: null,
            specialPrice: 0,
          });
          continue;
        }

        // Calculate proportional price for this item
        // breakdown.totalPrice is for ALL items of this size
        // We need to calculate the proportion for this specific item
        const totalQty = totalQuantityBySize.get(size) || 1;
        const itemProportion = item.quantity / totalQty;
        const itemPrice = breakdown.totalPrice * itemProportion;

        itemsWithPricing.push({
          ...item,
          priceBreakdown: {
            ...breakdown,
            totalQuantity: item.quantity,
            totalPrice: itemPrice,
          },
          specialPrice: undefined,
        });
      }
    }

    // Calculate total price
    const normalProductsTotal = itemsWithPricing
      .filter(item => item.priceBreakdown)
      .reduce((sum, item) => sum + (item.priceBreakdown?.totalPrice || 0), 0);

    const totalPrice = specialProductsTotal + normalProductsTotal;

    console.log('[CartRepository] Price calculation summary:');
    console.log('  - Special products total:', specialProductsTotal);
    console.log('  - Normal products total:', normalProductsTotal);
    console.log('  - Grand total:', totalPrice);
    console.log('  - Normal items breakdown:', itemsWithPricing
      .filter(item => item.priceBreakdown)
      .map(item => ({
        product: item.product?.name,
        quantity: item.quantity,
        size: item.productVariant?.size,
        itemPrice: item.priceBreakdown?.totalPrice,
        pricePerUnit: item.priceBreakdown?.pricePerUnit,
      }))
    );

    return {
      id: cart.id,
      userId: cart.userId,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      items: itemsWithPricing,
      totalPrice,
    };
  }
}
