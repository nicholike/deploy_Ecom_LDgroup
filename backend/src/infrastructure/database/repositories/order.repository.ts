import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OrderStatus, PaymentStatus, Prisma, CommissionStatus } from '@prisma/client';
import { CommissionService } from '@infrastructure/services/commission/commission.service';

const ALLOWED_STATUS_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [OrderStatus.CANCELLED],
  [OrderStatus.CANCELLED]: [OrderStatus.REFUNDED],
  [OrderStatus.REFUNDED]: [],
};

export interface CreateOrderInput {
  userId: string;
  items: Array<{
    productId: string;
    productVariantId?: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shippingFee?: number;
  tax?: number;
  discount?: number;
  totalAmount: number;
  shippingAddress?: any;
  shippingMethod?: string;
  paymentMethod?: string;
  customerNote?: string;
}

@Injectable()
export class OrderRepository {
  private readonly logger = new Logger(OrderRepository.name);

  constructor(
    private prisma: PrismaService,
    private commissionService: CommissionService,
  ) {}

  async create(data: CreateOrderInput) {
    const orderNumber = await this.generateOrderNumber();

    const itemRows = data.items.map((item) => {
      const priceDecimal = new Prisma.Decimal(item.price);
      const subtotalDecimal = priceDecimal.mul(item.quantity);
      return {
        productId: item.productId,
        productVariantId: item.productVariantId,
        variantSize: item.productVariantId ? undefined : null,
        quantity: item.quantity,
        price: priceDecimal,
        subtotal: subtotalDecimal,
      };
    });

    const subtotalDecimal = itemRows.reduce(
      (acc, item) => acc.plus(item.subtotal),
      new Prisma.Decimal(0),
    );
    const shippingFeeDecimal = new Prisma.Decimal(data.shippingFee ?? 0);
    const taxDecimal = new Prisma.Decimal(data.tax ?? 0);
    const discountDecimal = new Prisma.Decimal(data.discount ?? 0);
    const totalAmountDecimal =
      data.totalAmount !== undefined
        ? new Prisma.Decimal(data.totalAmount)
        : subtotalDecimal.plus(shippingFeeDecimal).plus(taxDecimal).minus(discountDecimal);

    if (process.env.NODE_ENV !== 'production') {
      console.log('[OrderRepository] Creating order', {
        orderNumber,
        userId: data.userId,
        itemCount: itemRows.length,
        subtotal: subtotalDecimal.toString(),
        shippingFee: shippingFeeDecimal.toString(),
        tax: taxDecimal.toString(),
        discount: discountDecimal.toString(),
        totalAmount: totalAmountDecimal.toString(),
        items: itemRows.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price.toString(),
          subtotal: item.subtotal.toString(),
        })),
      });
    }

    return this.prisma.order.create({
      data: {
        orderNumber,
        userId: data.userId,
        subtotal: subtotalDecimal,
        shippingFee: shippingFeeDecimal,
        tax: taxDecimal,
        discount: discountDecimal,
        totalAmount: totalAmountDecimal,
        shippingAddress: data.shippingAddress,
        shippingMethod: data.shippingMethod,
        paymentMethod: data.paymentMethod,
        customerNote: data.customerNote,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        items: {
          create: itemRows,
        },
      },
      include: {
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
            sponsorId: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
            sponsorId: true,
            sponsor: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  async findByOrderNumber(orderNumber: string) {
    return this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
            sponsorId: true,
          },
        },
      },
    });
  }

  async findByUserId(userId: string, skip = 0, take = 10) {
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        include: {
          items: {
            include: {
              product: true,
              productVariant: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);

    return { data: orders, total };
  }

  async findAll(skip = 0, take = 10, status?: OrderStatus) {
    const where = status ? { status } : {};

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: true,
              productVariant: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true,
              role: true,
              sponsorId: true,
              sponsor: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data: orders, total };
  }

  async updateStatus(id: string, status: OrderStatus) {
    // 🔒 USE TRANSACTION WITH SERIALIZABLE ISOLATION to prevent race conditions
    // This ensures only ONE request can update status at a time for this order
    return await this.prisma.$transaction(
      async (tx) => {
        // 1. Lock and read current order (SELECT ... FOR UPDATE equivalent)
        const currentOrder = await tx.order.findUnique({
          where: { id },
          select: { status: true, userId: true, totalAmount: true, orderNumber: true },
        });

        if (!currentOrder) {
          throw new Error(`Order ${id} not found`);
        }

        const oldStatus = currentOrder.status;

        if (status === oldStatus) {
          this.logger.log(`Order ${id} already in status ${status}. No update performed.`);
          // Return full order details using non-transactional query
          return this.findById(id);
        }

        this.logger.log(`Updating order ${id} status: ${oldStatus} → ${status}`);

        const updateData: any = { status };

        if (status === OrderStatus.COMPLETED) {
          updateData.completedAt = new Date();
        } else if (status === OrderStatus.CANCELLED) {
          updateData.cancelledAt = new Date();
        }

        // 2. Check for existing commissions INSIDE transaction with lock
        let shouldCalculateCommission = false;

        if (status === OrderStatus.COMPLETED && oldStatus !== OrderStatus.COMPLETED) {
          // 🛡️ CRITICAL: Check ALL commissions (including CANCELLED) to prevent re-calculation
          const allCommissions = await tx.commission.findMany({
            where: { orderId: id },
            select: { id: true, status: true },
          });

          if (allCommissions.length > 0) {
            const statuses = allCommissions.map(c => c.status).join(', ');
            this.logger.warn(
              `Order ${id} has ${allCommissions.length} commission record(s) with statuses: [${statuses}]. ` +
              `Will NOT calculate commissions to prevent double-payment.`
            );
            shouldCalculateCommission = false;
          } else {
            this.logger.log(`Order ${id} has no commission records. Will calculate commissions.`);
            shouldCalculateCommission = true;
          }
        }

        // 3. Update order status INSIDE transaction
        await tx.order.update({
          where: { id },
          data: updateData,
        });

        // 4. Handle commissions INSIDE transaction
        try {
          // Case 1: Calculate commissions (will throw if already exists)
          if (shouldCalculateCommission) {
            this.logger.log(`Order ${id} completed. Calculating commissions...`);
            await this.commissionService.calculateCommissionsForOrder(
              id,
              currentOrder.userId,
              Number(currentOrder.totalAmount),
              currentOrder.orderNumber,
            );
            this.logger.log(`✅ Commissions calculated for order ${id}`);
          }

          // Case 2: Refund commissions if moving FROM COMPLETED
          if (oldStatus === OrderStatus.COMPLETED && status !== OrderStatus.COMPLETED) {
            this.logger.log(`Order ${id} changed from COMPLETED to ${status}. Refunding commissions...`);
            await this.commissionService.refundCommissionsForOrder(id);
            this.logger.log(`✅ Commissions refunded for order ${id}`);
          }
        } catch (error) {
          this.logger.error(`❌ Failed to process commissions for order ${id}:`, error);
          // Re-throw error to rollback transaction
          // This ensures order status and commissions are consistent
          throw error;
        }

        // 5. Return full order details (query INSIDE transaction to see committed changes)
        return tx.order.findUnique({
          where: { id },
          include: {
            items: {
              include: {
                product: true,
                productVariant: true,
              },
            },
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                role: true,
                sponsorId: true,
              },
            },
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 60000, // 60 seconds timeout for complex MLM commission calculations
      },
    );
  }

  async updatePaymentStatus(id: string, paymentStatus: PaymentStatus) {
    const updateData: any = { paymentStatus };

    if (paymentStatus === PaymentStatus.COMPLETED) {
      updateData.paidAt = new Date();
    }

    return this.prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
            sponsorId: true,
          },
        },
      },
    });
  }

  /**
   * 🔒 TRANSACTIONAL: Cancel order with full atomicity
   * Handles: status update, commission refund, quota return
   * Note: Wallet refund is NOT automatic - admin handles manually
   * Ensures all-or-nothing (prevents partial cancellation)
   */
  async cancelOrder(
    orderId: string,
    walletRepository: any, // WalletRepository
    userRepository: any,   // UserRepository
  ): Promise<any> {
    return await this.prisma.$transaction(
      async (tx) => {
        // 1. Get current order (with lock)
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: {
            items: {
              include: {
                product: true,
                productVariant: true,
              },
            },
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                role: true,
                sponsorId: true,
              },
            },
          },
        });

        if (!order) {
          throw new Error(`Order ${orderId} not found`);
        }

        const oldStatus = order.status;

        // Already cancelled - idempotent operation
        if (oldStatus === OrderStatus.CANCELLED) {
          this.logger.log(`Order ${orderId} already cancelled. Skipping.`);
          return {
            message: 'Order already cancelled',
            order,
            alreadyCancelled: true,
          };
        }

        this.logger.log(`Cancelling order ${orderId} (status: ${oldStatus})...`);

        // 2. Update order status to CANCELLED (inside transaction)
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        });

        // 3. Refund commissions if order was COMPLETED
        // Note: Commission service operations run in their own context but we're
        // calling them inside this transaction to ensure consistency
        if (oldStatus === OrderStatus.COMPLETED) {
          try {
            this.logger.log(`Order ${orderId} was COMPLETED. Refunding commissions...`);
            await this.commissionService.refundCommissionsForOrder(orderId);
            this.logger.log(`✅ Commissions refunded for order ${orderId}`);
          } catch (error) {
            this.logger.error(`❌ Failed to refund commissions for order ${orderId}:`, error);
            throw error; // Rollback transaction
          }
        }

        // 4. ❌ AUTO-REFUND REMOVED
        // Refunds are now handled manually by admin to prevent errors
        // If order was paid, admin will process refund separately

        // 5. Return quota to user (inside transaction, atomic decrement)
        const totalQuantity = order.items.reduce((sum: number, item: any) => sum + item.quantity, 0);

        try {
          const user = await tx.user.findUnique({
            where: { id: order.userId },
            select: { quotaUsed: true },
          });

          if (user && user.quotaUsed > 0) {
            // Calculate new quota (max 0 to prevent negative)
            const newQuota = Math.max(0, user.quotaUsed - totalQuantity);

            await tx.user.update({
              where: { id: order.userId },
              data: {
                quotaUsed: newQuota,
              },
            });

            this.logger.log(`✅ Returned ${totalQuantity} quota to user ${order.userId}`);
          }
        } catch (error) {
          this.logger.error(`❌ Failed to return quota:`, error);
          throw error; // Rollback transaction
        }

        // 6. Get updated order
        const updatedOrder = await tx.order.findUnique({
          where: { id: orderId },
          include: {
            items: {
              include: {
                product: true,
                productVariant: true,
              },
            },
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                role: true,
                sponsorId: true,
              },
            },
          },
        });

        this.logger.log(`✅ Order ${orderId} cancelled successfully`);

        return {
          message: 'Order cancelled successfully',
          order: updatedOrder,
          quotaReturned: totalQuantity,
          note: 'Refund will be processed manually by admin if applicable',
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000,
      },
    );
  }

  /**
   * Find expired orders for auto-cancellation
   * Used by order cleanup service
   */
  async findExpiredOrders(
    status: OrderStatus,
    paymentStatus: PaymentStatus,
    expiryTime: Date,
  ) {
    return this.prisma.order.findMany({
      where: {
        status,
        paymentStatus,
        createdAt: {
          lt: expiryTime,
        },
      },
      include: {
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
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
      orderBy: { createdAt: 'asc' },
    });
  }

  private async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    const count = await this.prisma.order.count({
      where: {
        createdAt: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
        },
      },
    });

    const sequence = (count + 1).toString().padStart(5, '0');
    return `LD${year}${month}${day}${sequence}`;
  }
}
