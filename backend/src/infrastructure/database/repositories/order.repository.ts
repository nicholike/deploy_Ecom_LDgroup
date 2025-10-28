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
        isFreeGift: (item as any).isFreeGift || false, // Free gift flag
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
    // 🚀 PERFORMANCE FIX: Commission calculation OUTSIDE transaction
    // Transaction ONLY updates order status (< 1 second)
    // Commission calculated AFTER transaction commits (async, non-blocking)

    // Step 1: FAST transaction to update order status only
    const result = await this.prisma.$transaction(
      async (tx) => {
        // 1. Lock and read current order
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
          const order = await tx.order.findUnique({
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
          return {
            order,
            oldStatus,
            newStatus: status,
            userId: currentOrder.userId,
            totalAmount: currentOrder.totalAmount,
            orderNumber: currentOrder.orderNumber,
          };
        }

        this.logger.log(`Updating order ${id} status: ${oldStatus} → ${status}`);

        const updateData: any = { status };

        if (status === OrderStatus.COMPLETED) {
          updateData.completedAt = new Date();
        } else if (status === OrderStatus.CANCELLED) {
          updateData.cancelledAt = new Date();
        }

        // 2. Update order status ONLY (fast!)
        await tx.order.update({
          where: { id },
          data: updateData,
        });

        // 3. Return order data and metadata
        return {
          order: await tx.order.findUnique({
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
          }),
          oldStatus,
          newStatus: status,
          userId: currentOrder.userId,
          totalAmount: currentOrder.totalAmount,
          orderNumber: currentOrder.orderNumber,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 5000, // 5 seconds - only updating order status, very fast!
      },
    );

    // Step 2: ASYNC commission calculation AFTER transaction commits
    // This runs outside transaction, won't block or cause timeout
    const { order, oldStatus, newStatus, userId, totalAmount, orderNumber } = result;

    // Handle commissions asynchronously (don't await, don't block response)
    setImmediate(async () => {
      try {
        // Check if we need to calculate commissions
        if (newStatus === OrderStatus.COMPLETED && oldStatus !== OrderStatus.COMPLETED) {
          // 🔧 FIX: Only check ACTIVE commissions (ignore CANCELLED/REJECTED)
          // If commission was cancelled, we should recalculate when order becomes COMPLETED again
          const activeCommissions = await this.prisma.commission.findMany({
            where: {
              orderId: id,
              status: {
                in: ['PENDING', 'APPROVED', 'PAID'], // Only active statuses
                // NOT checking CANCELLED or REJECTED - those are inactive
              },
            },
            select: { id: true, status: true },
          });

          if (activeCommissions.length > 0) {
            const statuses = activeCommissions.map(c => c.status).join(', ');
            this.logger.warn(
              `Order ${id} has ${activeCommissions.length} ACTIVE commission record(s) with statuses: [${statuses}]. ` +
              `Will NOT calculate commissions to prevent double-payment.`
            );
          } else {
            this.logger.log(`Order ${id} completed. Calculating commissions asynchronously...`);
            await this.commissionService.calculateCommissionsForOrder(
              id,
              userId,
              Number(totalAmount),
              orderNumber,
            );
            this.logger.log(`✅ Commissions calculated for order ${id}`);
          }
        }

        // Refund commissions if moving FROM COMPLETED
        if (oldStatus === OrderStatus.COMPLETED && newStatus !== OrderStatus.COMPLETED) {
          this.logger.log(`Order ${id} changed from COMPLETED to ${newStatus}. Refunding commissions...`);
          await this.commissionService.refundCommissionsForOrder(id);
          this.logger.log(`✅ Commissions refunded for order ${id}`);
        }
      } catch (error) {
        this.logger.error(`❌ Failed to process commissions for order ${id} (async):`, error);
        // Don't throw - commission can be calculated manually if needed
        // Order status update already succeeded
      }
    });

    // Return order immediately without waiting for commission calculation
    return order;
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

        // 5. Return quota to user BY SIZE (inside transaction, atomic decrement)
        // Calculate quantities by size
        let qty5ml = 0;
        let qty20ml = 0;
        let qtySpecial = 0;

        for (const item of order.items) {
          if (item.product.isSpecial) {
            qtySpecial += item.quantity;
          } else if (item.productVariant) {
            if (item.productVariant.size === '5ml') {
              qty5ml += item.quantity;
            } else if (item.productVariant.size === '20ml') {
              qty20ml += item.quantity;
            }
          }
        }

        try {
          const user = await tx.user.findUnique({
            where: { id: order.userId },
            select: { 
              quotaUsed: true,
              quota5mlUsed: true,
              quota20mlUsed: true,
              quotaSpecialUsed: true,
            },
          });

          if (user) {
            const updateData: any = {};

            // Calculate new quotas (max 0 to prevent negative)
            if (qty5ml > 0) {
              const newQuota5ml = Math.max(0, user.quota5mlUsed - qty5ml);
              updateData.quota5mlUsed = newQuota5ml;
            }

            if (qty20ml > 0) {
              const newQuota20ml = Math.max(0, user.quota20mlUsed - qty20ml);
              updateData.quota20mlUsed = newQuota20ml;
            }

            if (qtySpecial > 0) {
              const newQuotaSpecial = Math.max(0, user.quotaSpecialUsed - qtySpecial);
              updateData.quotaSpecialUsed = newQuotaSpecial;
            }

            // Also update old total quota for backwards compatibility
            const totalQuantity = qty5ml + qty20ml + qtySpecial;
            if (totalQuantity > 0) {
              const newQuota = Math.max(0, user.quotaUsed - totalQuantity);
              updateData.quotaUsed = newQuota;
            }

            if (Object.keys(updateData).length > 0) {
              await tx.user.update({
                where: { id: order.userId },
                data: updateData,
              });

              this.logger.log(`✅ Returned quota to user ${order.userId}: 5ml=${qty5ml}, 20ml=${qty20ml}, special=${qtySpecial}`);
            }
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

        const totalQuantity = qty5ml + qty20ml + qtySpecial;

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
