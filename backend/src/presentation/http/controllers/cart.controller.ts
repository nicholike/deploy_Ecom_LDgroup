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
import { ProductRepository } from '@infrastructure/database/repositories/product.repository';
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
    private readonly productRepository: ProductRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user cart with size-specific quota info and pricing' })
  @ApiResponse({ status: 200 })
  async getCart(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    // Get cart with pricing calculations
    const cart = await this.cartRepository.getCartWithPricing(userId);

    // Get quota info (skip for admin)
    let quotaInfo = null;
    if (userRole !== UserRole.ADMIN) {
      quotaInfo = await this.userRepository.getQuotaInfo(userId);

      if (quotaInfo && cart) {
        // Calculate quantities in cart by size
        let cart5mlQty = 0;
        let cart20mlQty = 0;
        let cartSpecialQty = 0;

        for (const item of cart.items || []) {
          const product = await this.productRepository.findById(item.productId);
          if (product?.isSpecial) {
            cartSpecialQty += item.quantity;
          } else if (item.productVariant?.size === '5ml') {
            cart5mlQty += item.quantity;
          } else if (item.productVariant?.size === '20ml') {
            cart20mlQty += item.quantity;
          }
        }

        // Add cart quantities to quota info
        quotaInfo = {
          ...quotaInfo,
          quota5ml: {
            ...quotaInfo.quota5ml,
            inCart: cart5mlQty,
            remainingAfterCart: quotaInfo.quota5ml.remaining - cart5mlQty,
          },
          quota20ml: {
            ...quotaInfo.quota20ml,
            inCart: cart20mlQty,
            remainingAfterCart: quotaInfo.quota20ml.remaining - cart20mlQty,
          },
          quotaSpecial: {
            ...quotaInfo.quotaSpecial,
            inCart: cartSpecialQty,
            remainingAfterCart: quotaInfo.quotaSpecial.remaining - cartSpecialQty,
          },
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
  @ApiOperation({ summary: 'Add item to cart (with size-specific quota check)' })
  @ApiResponse({ status: 201 })
  async addToCart(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: AddToCartDto,
  ) {
    // Skip quota check for admin
    if (userRole !== UserRole.ADMIN) {
      // Get product info to determine if special (with variants)
      const product = await this.productRepository.findByIdWithVariants(dto.productId);
      if (!product) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }

      // Get quota info
      const quotaInfo = await this.userRepository.getQuotaInfo(userId);
      if (!quotaInfo) {
        throw new HttpException('User quota info not found', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Determine quota type based on product type
      let quotaType: 'special' | '5ml' | '20ml' = 'special';
      let currentQuota: { limit: number; used: number; remaining: number };
      let sizeName = 'sản phẩm đặc biệt';

      if (product.isSpecial) {
        // Special product
        quotaType = 'special';
        currentQuota = quotaInfo.quotaSpecial;
        sizeName = 'sản phẩm đặc biệt';
      } else if (dto.productVariantId) {
        // Get variant to check size
        const variant = product.variants?.find((v: any) => v.id === dto.productVariantId);
        if (!variant) {
          throw new HttpException('Product variant not found', HttpStatus.NOT_FOUND);
        }

        if (variant.size === '5ml') {
          quotaType = '5ml';
          currentQuota = quotaInfo.quota5ml;
          sizeName = '5ml';
        } else if (variant.size === '20ml') {
          quotaType = '20ml';
          currentQuota = quotaInfo.quota20ml;
          sizeName = '20ml';
        } else {
          throw new HttpException(`Unsupported variant size: ${variant.size}`, HttpStatus.BAD_REQUEST);
        }
      } else {
        throw new HttpException('productVariantId is required for normal products', HttpStatus.BAD_REQUEST);
      }

      // Check if adding this quantity would exceed limit
      if (dto.quantity > currentQuota.remaining) {
        const exceeded = dto.quantity - currentQuota.remaining;
        throw new HttpException(
          `Không thể thêm ${dto.quantity} chai ${sizeName}. Bạn chỉ có thể thêm ${currentQuota.remaining} chai nữa (Hạn mức ${sizeName}: ${currentQuota.limit} chai/30 ngày). Vượt quá ${exceeded} chai.`,
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
      message: userRole !== UserRole.ADMIN 
        ? `Đã thêm vào giỏ hàng. Hạn mức còn lại - 5ml: ${updatedQuota?.quota5ml.remaining}, 20ml: ${updatedQuota?.quota20ml.remaining}, Đặc biệt: ${updatedQuota?.quotaSpecial.remaining}` 
        : 'Item added to cart.',
      quotaInfo: updatedQuota,
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
