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
import { ProductRepository } from '@infrastructure/database/repositories/product.repository';
import { PendingOrderService } from '@infrastructure/services/pending-order/pending-order.service';
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
    private readonly productRepository: ProductRepository,
    private readonly pendingOrderService: PendingOrderService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create pending order from cart (NEW: No real order until payment)' })
  @ApiResponse({ status: 201, description: 'Pending order created. User must pay within 30 minutes.' })
  async createOrder(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: CreateOrderDto,
  ) {
    /**
     * ✅ NEW FLOW (Prevents quota bypass):
     * 1. Create PendingOrder (NOT Order)
     * 2. User redirected to payment page
     * 3. If user pays → Webhook creates real Order
     * 4. If no payment within 30 min → PendingOrder expires
     *
     * Cart and quota are NOT touched until payment confirmed!
     */

    // Get cart
    const cart = await this.cartRepository.getCartByUserId(userId);
    if (!cart || cart.items.length === 0) {
      throw new HttpException('Giỏ hàng trống', HttpStatus.BAD_REQUEST);
    }

    // Calculate quantities by size
    let qty5ml = 0;
    let qty20ml = 0;
    let qtySpecial = 0;

    for (const item of cart.items) {
      const product = await this.productRepository.findByIdWithVariants(item.productId);
      if (!product) {
        throw new HttpException(`Product ${item.productId} not found`, HttpStatus.NOT_FOUND);
      }

      if (product.isSpecial) {
        qtySpecial += item.quantity;
      } else if (item.productVariantId) {
        const variant = product.variants?.find((v: any) => v.id === item.productVariantId);
        if (!variant) {
          throw new HttpException(`Variant ${item.productVariantId} not found`, HttpStatus.NOT_FOUND);
        }

        if (variant.size === '5ml') {
          qty5ml += item.quantity;
        } else if (variant.size === '20ml') {
          qty20ml += item.quantity;
        }
      }
    }

    // Check quota for non-admin users
    // NOTE: We still check quota here, but we DON'T update it
    // This prevents creating a pending order that would exceed quota
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
          quota5mlUsed: 0,
          quota20mlUsed: 0,
          quotaSpecialUsed: 0,
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

      // Check each quota limit
      const errors: string[] = [];
      
      if (qty5ml > quotaInfo.quota5ml.remaining) {
        errors.push(`5ml: vượt quá ${qty5ml - quotaInfo.quota5ml.remaining} chai (còn lại: ${quotaInfo.quota5ml.remaining}/${quotaInfo.quota5ml.limit})`);
      }

      if (qty20ml > quotaInfo.quota20ml.remaining) {
        errors.push(`20ml: vượt quá ${qty20ml - quotaInfo.quota20ml.remaining} chai (còn lại: ${quotaInfo.quota20ml.remaining}/${quotaInfo.quota20ml.limit})`);
      }

      // Special products (Kit) have no limit - skip check
      // if (qtySpecial > quotaInfo.quotaSpecial.remaining) {
      //   errors.push(`Sản phẩm đặc biệt: vượt quá ${qtySpecial - quotaInfo.quotaSpecial.remaining} chai (còn lại: ${quotaInfo.quotaSpecial.remaining}/${quotaInfo.quotaSpecial.limit})`);
      // }

      if (errors.length > 0) {
        throw new HttpException(
          `Không thể đặt hàng. Vượt quá hạn mức:\n${errors.join('\n')}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Create PendingOrder (will be converted to Order after payment)
    const pendingOrder = await this.pendingOrderService.createPendingOrderFromCart({
      userId,
      shippingAddress: dto.shippingAddress,
      shippingMethod: dto.shippingMethod,
      paymentMethod: dto.paymentMethod,
      customerNote: dto.customerNote,
    });

    return {
      ...pendingOrder,
      message: 'Pending order created. Please complete payment within 30 minutes.',
      expiresIn: '30 minutes',
    };
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

    // Update order status (commission logic handled in repository)
    const updatedOrder = await this.orderRepository.updateStatus(id, dto.status);

    return updatedOrder;
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

    // Use transactional cancelOrder method
    return this.orderRepository.cancelOrder(id, this.walletRepository, this.userRepository);
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

    // Use transactional cancelOrder method
    return this.orderRepository.cancelOrder(id, this.walletRepository, this.userRepository);
  }

  /**
   * ❌ DEPRECATED: Replaced by OrderRepository.cancelOrder()
   * Old non-transactional method - DO NOT USE
   * Kept for reference only
   */
  // private async processCancelOrder(order: any) { ... }
}
