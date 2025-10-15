import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface CartItemInput {
  productId: string;
  productVariantId?: string;
  quantity: number;
}

@Injectable()
export class CartRepository {
  constructor(private prisma: PrismaService) {}

  async getCartByUserId(userId: string) {
    return this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
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
              product: true,
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

    if (quantity <= 0) {
      return this.removeItem(userId, itemId);
    }

    return this.prisma.cartItem.update({
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
}
