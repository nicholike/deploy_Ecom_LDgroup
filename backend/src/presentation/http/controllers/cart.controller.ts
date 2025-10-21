import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { CartRepository } from '@infrastructure/database/repositories/cart.repository';
import { UserRepository } from '@infrastructure/database/repositories/user.repository';
import { UserRole } from '@shared/constants/user-roles.constant';

class AddToCartDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  productVariantId?: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

class UpdateCartItemDto {
  @IsNumber()
  @Min(0)
  quantity: number;
}

@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly userRepository: UserRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user cart with quota info and pricing' })
  @ApiResponse({ status: 200 })
  async getCart(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    // Get cart with pricing calculations
    const cart = await this.cartRepository.getCartWithPricing(userId);

    // Get quota info (skip for admin)
    let quotaInfo = null;
    if (userRole !== UserRole.ADMIN && cart) {
      quotaInfo = await this.userRepository.getQuotaInfo(userId);

      // Calculate total quantity in cart
      const cartQuantity = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

      if (quotaInfo) {
        quotaInfo = {
          ...quotaInfo,
          cartQuantity,
          remainingAfterCart: quotaInfo.quotaRemaining - cartQuantity,
        };
      }
    }

    const response = {
      ...cart,
      quotaInfo,
    };

    console.log('[CartController] Returning cart with totalPrice:', response.totalPrice);
    console.log('[CartController] Cart items count:', response.items?.length || 0);

    return response;
  }

  @Get('pricing-preview')
  @ApiOperation({ summary: 'Calculate pricing preview for cart (real-time)' })
  @ApiResponse({ status: 200 })
  async getCartPricingPreview(@CurrentUser('userId') userId: string) {
    const cart = await this.cartRepository.getCartWithPricing(userId);

    if (!cart) {
      return {
        items: [],
        totalPrice: 0,
      };
    }

    // Return simplified pricing info
    return {
      items: cart.items.map(item => ({
        id: item.id,
        productId: item.productId,
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        priceBreakdown: item.priceBreakdown,
        specialPrice: item.specialPrice,
      })),
      totalPrice: cart.totalPrice,
    };
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart (with quota check)' })
  @ApiResponse({ status: 201 })
  async addToCart(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: AddToCartDto,
  ) {
    // Skip quota check for admin
    if (userRole !== UserRole.ADMIN) {
      // Get current cart
      const cart = await this.cartRepository.getCartByUserId(userId);
      const currentCartQty = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

      // Get quota info
      const quotaInfo = await this.userRepository.getQuotaInfo(userId);
      if (!quotaInfo) {
        throw new HttpException('User quota info not found', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Check if adding this quantity would exceed limit
      const totalAfterAdd = currentCartQty + dto.quantity;
      if (totalAfterAdd > quotaInfo.quotaRemaining) {
        const exceeded = totalAfterAdd - quotaInfo.quotaRemaining;
        throw new HttpException(
          `Cannot add ${dto.quantity} items. You can only add ${quotaInfo.quotaRemaining - currentCartQty} more products. (Exceeded by ${exceeded})`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Add to cart
    const result = await this.cartRepository.addItem(userId, dto);

    // Get updated quota info
    const updatedQuota = userRole !== UserRole.ADMIN ? await this.userRepository.getQuotaInfo(userId) : null;

    return {
      ...result,
      message: userRole !== UserRole.ADMIN ? `Item added. You can purchase ${updatedQuota?.quotaRemaining} more products.` : 'Item added to cart.',
      quotaRemaining: updatedQuota?.quotaRemaining,
    };
  }

  @Put('items/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({ status: 200 })
  async updateItem(
    @CurrentUser('userId') userId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    console.log(`[CartController] PUT /cart/items/${itemId} - userId: ${userId}, quantity: ${dto.quantity}`);
    return this.cartRepository.updateItemQuantity(userId, itemId, dto.quantity);
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 204 })
  async removeItem(
    @CurrentUser('userId') userId: string,
    @Param('itemId') itemId: string,
  ) {
    await this.cartRepository.removeItem(userId, itemId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear cart' })
  @ApiResponse({ status: 204 })
  async clearCart(@CurrentUser('userId') userId: string) {
    await this.cartRepository.clearCart(userId);
  }
}
