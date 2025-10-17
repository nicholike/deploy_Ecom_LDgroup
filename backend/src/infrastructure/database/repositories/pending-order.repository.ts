import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PendingOrder, PendingOrderStatus } from '@prisma/client';

@Injectable()
export class PendingOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new pending order
   */
  async create(data: {
    userId: string;
    items: any; // JSON snapshot of cart items
    subtotal: number;
    shippingFee: number;
    tax?: number;
    discount?: number;
    totalAmount: number;
    shippingAddress?: any;
    shippingMethod?: string;
    paymentMethod?: string;
    customerNote?: string;
    expiresAt: Date; // Should be 30 minutes from now
  }): Promise<PendingOrder> {
    const pendingNumber = await this.generatePendingNumber();

    return this.prisma.pendingOrder.create({
      data: {
        pendingNumber,
        userId: data.userId,
        items: data.items,
        subtotal: data.subtotal,
        shippingFee: data.shippingFee,
        tax: data.tax || 0,
        discount: data.discount || 0,
        totalAmount: data.totalAmount,
        shippingAddress: data.shippingAddress,
        shippingMethod: data.shippingMethod,
        paymentMethod: data.paymentMethod,
        customerNote: data.customerNote,
        expiresAt: data.expiresAt,
        status: PendingOrderStatus.AWAITING_PAYMENT,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Find pending order by ID
   */
  async findById(id: string): Promise<PendingOrder | null> {
    return this.prisma.pendingOrder.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        order: true, // If already converted to real order
      },
    });
  }

  /**
   * Find pending order by pending number
   */
  async findByPendingNumber(pendingNumber: string): Promise<PendingOrder | null> {
    return this.prisma.pendingOrder.findUnique({
      where: { pendingNumber },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        order: true,
      },
    });
  }

  /**
   * Update pending order status
   */
  async updateStatus(
    id: string,
    status: PendingOrderStatus,
    additionalData?: {
      paidAt?: Date;
      cancelledAt?: Date;
      orderId?: string; // Link to created order
    },
  ): Promise<PendingOrder> {
    return this.prisma.pendingOrder.update({
      where: { id },
      data: {
        status,
        paidAt: additionalData?.paidAt,
        cancelledAt: additionalData?.cancelledAt,
        orderId: additionalData?.orderId,
      },
    });
  }

  /**
   * Find expired pending orders (older than expiresAt and still AWAITING_PAYMENT)
   */
  async findExpired(beforeDate: Date): Promise<PendingOrder[]> {
    return this.prisma.pendingOrder.findMany({
      where: {
        status: PendingOrderStatus.AWAITING_PAYMENT,
        expiresAt: {
          lt: beforeDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * Find pending orders by user ID
   */
  async findByUserId(
    userId: string,
    skip: number = 0,
    take: number = 10,
  ): Promise<{ data: PendingOrder[]; total: number }> {
    const where = { userId };

    const [data, total] = await Promise.all([
      this.prisma.pendingOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          order: true,
        },
      }),
      this.prisma.pendingOrder.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Delete pending order (after conversion or expiry)
   */
  async delete(id: string): Promise<void> {
    await this.prisma.pendingOrder.delete({
      where: { id },
    });
  }

  /**
   * Generate unique pending order number
   * Format: PD25XXXXXXXXX (PD + year + random)
   */
  private async generatePendingNumber(): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2); // Last 2 digits of year
    let pendingNumber: string;
    let isUnique = false;

    while (!isUnique) {
      const randomPart = Math.random().toString(36).substring(2, 11).toUpperCase();
      pendingNumber = `PD${year}${randomPart}`;

      const existing = await this.prisma.pendingOrder.findUnique({
        where: { pendingNumber },
      });

      if (!existing) {
        isUnique = true;
      }
    }

    return pendingNumber!;
  }
}
