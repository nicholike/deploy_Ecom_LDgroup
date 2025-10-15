import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@shared/constants/user-roles.constant';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { OrderRepository } from '@infrastructure/database/repositories/order.repository';
import { CartRepository } from '@infrastructure/database/repositories/cart.repository';
import { UserRepository } from '@infrastructure/database/repositories/user.repository';
import { WalletRepository } from '@infrastructure/database/repositories/wallet.repository';
import { PriceTierRepository } from '@infrastructure/database/repositories/price-tier.repository';
import { CommissionService } from '@infrastructure/services/commission/commission.service';
import { OrderStatus, PaymentStatus, WalletTransactionType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ShippingAddressDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  ward?: string;
}

class CreateOrderDto {
  @ValidateNested()
  @IsOptional()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;

  @IsString()
  @IsOptional()
  shippingMethod?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  customerNote?: string;
}

class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus;
}

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrderController {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly cartRepository: CartRepository,
    private readonly userRepository: UserRepository,
    private readonly walletRepository: WalletRepository,
    private readonly priceTierRepository: PriceTierRepository,
    private readonly commissionService: CommissionService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create order from cart with price tiers & quota update' })
  @ApiResponse({ status: 201 })
  async createOrder(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: CreateOrderDto,
  ) {
    // Get cart
    const cart = await this.cartRepository.getCartByUserId(userId);
    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    // Calculate total quantity
    const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    // Check quota for non-admin users
    if (userRole !== UserRole.ADMIN) {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Check if period expired
      const now = new Date();
      const periodExpired =
        user.quotaPeriodStart && now.getTime() - user.quotaPeriodStart.getTime() > 30 * 24 * 60 * 60 * 1000;

      // Reset if expired
      if (periodExpired) {
        await this.userRepository.update(userId, {
          quotaPeriodStart: now,
          quotaUsed: 0,
        });
      }

      // Set period start if first order
      if (!user.quotaPeriodStart) {
        await this.userRepository.update(userId, {
          quotaPeriodStart: now,
        });
      }

      // Get fresh quota info
      const quotaInfo = await this.userRepository.getQuotaInfo(userId);
      if (!quotaInfo) {
        throw new HttpException('Quota info not found', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Check if exceeds limit
      if (totalQuantity > quotaInfo.quotaRemaining) {
        throw new HttpException(
          `Cannot place order. Exceeds purchase limit by ${totalQuantity - quotaInfo.quotaRemaining} products. (Remaining: ${quotaInfo.quotaRemaining})`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Calculate totals with price tiers
    const items = await Promise.all(
      cart.items.map(async (item) => {
        let price: number;

        // If has variant, try to get tier price
        if (item.productVariantId) {
          const tierPrice = await this.priceTierRepository.getPriceForQuantity(
            item.productVariantId,
            item.quantity,
          );

          if (tierPrice !== null) {
            price = tierPrice;
          } else {
            // Fallback to variant price
            price = Number(item.productVariant?.salePrice || item.productVariant?.price);
          }
        } else {
          // No variant, use product price
          price = Number(item.product.salePrice || item.product.price);
        }

        return {
          productId: item.productId,
          productVariantId: item.productVariantId || undefined,
          quantity: item.quantity,
          price,
        };
      }),
    );

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingFee = 0; // Free shipping for now
    const totalAmount = subtotal + shippingFee;

    // Create order
    const order = await this.orderRepository.create({
      userId,
      items,
      subtotal,
      shippingFee,
      totalAmount,
      shippingAddress: dto.shippingAddress,
      shippingMethod: dto.shippingMethod,
      paymentMethod: dto.paymentMethod,
      customerNote: dto.customerNote,
    });

    // Update quota for non-admin users
    if (userRole !== UserRole.ADMIN) {
      const user = await this.userRepository.findById(userId);
      if (user) {
        await this.userRepository.update(userId, {
          quotaUsed: user.quotaUsed + totalQuantity,
        });
      }
    }

    // Clear cart
    await this.cartRepository.clearCart(userId);

    return order;
  }

  @Get()
  @ApiOperation({ summary: 'Get user orders' })
  @ApiResponse({ status: 200 })
  async getMyOrders(
    @CurrentUser('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    const result = await this.orderRepository.findByUserId(userId, skip, limitNum);

    return {
      data: result.data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum),
      },
    };
  }

  @Get('all')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all orders (Admin only)' })
  @ApiResponse({ status: 200 })
  async getAllOrders(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: OrderStatus,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    const result = await this.orderRepository.findAll(skip, limitNum, status);

    return {
      data: result.data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum),
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200 })
  async getOrder(
    @Param('id') id: string,
    @CurrentUser('userId') currentUserId: string,
    @CurrentUser('role') currentUserRole: string,
  ) {
    const order = await this.orderRepository.findById(id);

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    // Non-admin users can only view their own orders
    if (currentUserRole !== UserRole.ADMIN && order.userId !== currentUserId) {
      throw new HttpException('You can only view your own orders', HttpStatus.FORBIDDEN);
    }

    return order;
  }

  @Put(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update order status (Admin only)' })
  @ApiResponse({ status: 200 })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    // Get current order
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    const oldStatus = order.status;
    const newStatus = dto.status;

    // Update order status
    const updatedOrder = await this.orderRepository.updateStatus(id, newStatus);

    // Handle commission logic
    const wasCompleted = oldStatus === OrderStatus.COMPLETED;
    const isCompleted = newStatus === OrderStatus.COMPLETED;

    if (!wasCompleted && isCompleted) {
      // Chuyển từ status khác → COMPLETED: CỘNG hoa hồng
      try {
        await this.commissionService.calculateCommissionsForOrder(
          order.id,
          order.userId,
          Number(order.totalAmount),
        );
        console.log(`✅ Added commissions for order ${order.id} (${oldStatus} → ${newStatus})`);
      } catch (error) {
        console.error('Failed to calculate commissions:', error);
        // Continue even if commission fails
      }
    } else if (wasCompleted && !isCompleted) {
      // Chuyển từ COMPLETED → status khác: TRỪ hoa hồng
      try {
        await this.commissionService.refundCommissionsForOrder(order.id);
        console.log(`✅ Refunded commissions for order ${order.id} (${oldStatus} → ${newStatus})`);
      } catch (error) {
        console.error('Failed to refund commissions:', error);
        // Continue even if commission refund fails
      }
    }

    return {
      ...updatedOrder,
      commissionAction: !wasCompleted && isCompleted ? 'added' : wasCompleted && !isCompleted ? 'refunded' : 'none',
    };
  }

  @Put(':id/payment-status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update payment status (Admin only)' })
  @ApiResponse({ status: 200 })
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.orderRepository.updatePaymentStatus(id, dto.paymentStatus);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel order (User - PENDING only)' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  async cancelOrder(
    @Param('id') id: string,
    @CurrentUser('userId') currentUserId: string,
    @CurrentUser('role') currentUserRole: string,
  ) {
    // Get order
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    // Only owner can cancel
    if (order.userId !== currentUserId) {
      throw new HttpException('You can only cancel your own orders', HttpStatus.FORBIDDEN);
    }

    // User can only cancel PENDING orders
    if (order.status !== OrderStatus.PENDING) {
      throw new HttpException(
        `Cannot cancel order with status: ${order.status}. Only PENDING orders can be cancelled.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.processCancelOrder(order);
  }

  @Post(':id/admin-cancel')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel order (Admin - all statuses except COMPLETED/DELIVERED)' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  async adminCancelOrder(@Param('id') id: string) {
    // Get order
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    // Admin cannot cancel COMPLETED or DELIVERED orders
    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED) {
      throw new HttpException(
        `Cannot cancel ${order.status} orders. Please use refund instead.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Already cancelled
    if (order.status === OrderStatus.CANCELLED) {
      throw new HttpException('Order is already cancelled', HttpStatus.BAD_REQUEST);
    }

    return this.processCancelOrder(order);
  }

  /**
   * Process order cancellation
   * - Update order status to CANCELLED
   * - Refund to wallet if paid
   * - Refund commissions
   * - Return quota to user
   */
  private async processCancelOrder(order: any) {
    // 1. Update order status to CANCELLED
    await this.orderRepository.updateStatus(order.id, OrderStatus.CANCELLED);

    // 2. If paid, refund to wallet
    if (order.paymentStatus === PaymentStatus.COMPLETED && order.paidAt) {
      await this.walletRepository.addTransaction({
        userId: order.userId,
        type: WalletTransactionType.ORDER_REFUND,
        amount: Number(order.totalAmount),
        orderId: order.id,
        description: `Refund for cancelled order #${order.orderNumber}`,
      });
    }

    // 3. Refund commissions (if any were created)
    try {
      await this.commissionService.refundCommissionsForOrder(order.id);
    } catch (error) {
      console.error('Failed to refund commissions:', error);
      // Continue even if commission refund fails
    }

    // 4. Return quota to user (calculate total quantity from order items)
    const totalQuantity = order.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    const user = await this.userRepository.findById(order.userId);

    if (user && user.quotaUsed > 0) {
      const newQuotaUsed = Math.max(0, user.quotaUsed - totalQuantity);
      await this.userRepository.update(user.id, {
        quotaUsed: newQuotaUsed,
      });
    }

    // Get updated order
    const updatedOrder = await this.orderRepository.findById(order.id);

    return {
      message: 'Order cancelled successfully',
      order: updatedOrder,
      refunded: order.paymentStatus === PaymentStatus.COMPLETED,
      refundAmount: order.paymentStatus === PaymentStatus.COMPLETED ? Number(order.totalAmount) : 0,
      quotaReturned: totalQuantity,
    };
  }
}
