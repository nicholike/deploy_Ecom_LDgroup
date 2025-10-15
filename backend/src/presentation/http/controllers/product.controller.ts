import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateProductDto } from '../dto/product/create-product.dto';
import { UpdateProductDto } from '../dto/product/update-product.dto';
import { ProductResponseDto } from '../dto/product/product-response.dto';
import { ListProductsDto } from '../dto/product/list-products.dto';
import { CreateProductCommand } from '@core/application/product/commands/create-product/create-product.command';
import { CreateProductHandler } from '@core/application/product/commands/create-product/create-product.handler';
import { UpdateProductCommand } from '@core/application/product/commands/update-product/update-product.command';
import { UpdateProductHandler } from '@core/application/product/commands/update-product/update-product.handler';
import { DeleteProductCommand } from '@core/application/product/commands/delete-product/delete-product.command';
import { DeleteProductHandler } from '@core/application/product/commands/delete-product/delete-product.handler';
import { GetProductQuery } from '@core/application/product/queries/get-product/get-product.query';
import { GetProductHandler } from '@core/application/product/queries/get-product/get-product.handler';
import { ListProductsQuery } from '@core/application/product/queries/list-products/list-products.query';
import { ListProductsHandler } from '@core/application/product/queries/list-products/list-products.handler';
import { IProductVariantRepository } from '@core/domain/product/interfaces/product-variant.repository.interface';
import { PriceTierRepository } from '@infrastructure/database/repositories/price-tier.repository';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@shared/constants/user-roles.constant';
import { Public } from '@shared/decorators/public.decorator';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { IsNumber, IsOptional, IsArray, ValidateNested, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

// DTOs for Price Tiers
class PriceTierDto {
  @IsNumber()
  @Min(1)
  minQuantity: number;

  @IsNumber()
  @IsOptional()
  maxQuantity?: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  label?: string;

  @IsNumber()
  @IsOptional()
  order?: number;
}

class SetPriceTiersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceTierDto)
  tiers: PriceTierDto[];
}

class UpdateVariantDto {
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

@ApiTags('Products')
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProductController {
  constructor(
    private readonly createProductHandler: CreateProductHandler,
    private readonly updateProductHandler: UpdateProductHandler,
    private readonly deleteProductHandler: DeleteProductHandler,
    private readonly getProductHandler: GetProductHandler,
    private readonly listProductsHandler: ListProductsHandler,
    @Inject('IProductVariantRepository')
    private readonly productVariantRepository: IProductVariantRepository,
    private readonly priceTierRepository: PriceTierRepository,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new product (Admin only)' })
  @ApiResponse({ status: 201, type: ProductResponseDto })
  async create(@Body() dto: CreateProductDto): Promise<ProductResponseDto> {
    const command = new CreateProductCommand(
      dto.name,
      dto.description,
      dto.price,
      dto.sku,
      dto.stock,
      dto.costPrice,
      dto.salePrice,
      dto.lowStockThreshold,
      dto.isCommissionEligible,
      dto.images,
      dto.thumbnail,
      dto.categoryId,
      dto.status,
      dto.metaTitle,
      dto.metaDescription,
      dto.variants,
    );

    const product = await this.createProductHandler.execute(command);

    // Fetch variants if they exist
    const variants = await this.productVariantRepository.findByProductId(product.id);

    return ProductResponseDto.fromDomain(product, variants);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all products with filters' })
  @ApiResponse({ status: 200, type: [ProductResponseDto] })
  async list(@Query() query: ListProductsDto) {
    const listQuery = new ListProductsQuery(
      query.page,
      query.limit,
      query.categoryId,
      query.status,
      query.minPrice,
      query.maxPrice,
      query.inStock,
      query.search,
    );

    const result = await this.listProductsHandler.execute(listQuery);

    // Fetch variants for all products
    const productIds = result.data.map((p) => p.id);
    const allVariants = await Promise.all(
      productIds.map((id) => this.productVariantRepository.findByProductId(id)),
    );

    // Create a map of productId -> variants
    const variantsMap = new Map<string, any[]>();
    productIds.forEach((id, index) => {
      variantsMap.set(id, allVariants[index]);
    });

    // Fetch categories for all products
    const categoryIds = [...new Set(result.data.map(p => p.categoryId).filter(Boolean))] as string[];
    const categories = categoryIds.length > 0 ? await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, slug: true },
    }) : [];

    // Create a map of categoryId -> category
    const categoriesMap = new Map<string, any>();
    categories.forEach((category) => {
      categoriesMap.set(category.id, category);
    });

    return {
      data: result.data.map((product) =>
        ProductResponseDto.fromDomain(
          product,
          variantsMap.get(product.id),
          product.categoryId ? categoriesMap.get(product.categoryId) : undefined
        )
      ),
      pagination: result.pagination,
    };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  async findOne(@Param('id') id: string): Promise<ProductResponseDto> {
    const query = new GetProductQuery(id);
    const product = await this.getProductHandler.execute(query);
    const variants = await this.productVariantRepository.findByProductId(product.id);
    return ProductResponseDto.fromDomain(product, variants);
  }

  @Get('by-slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get product by slug' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  async findBySlug(@Param('slug') slug: string): Promise<ProductResponseDto> {
    const query = new GetProductQuery(undefined, slug);
    const product = await this.getProductHandler.execute(query);
    const variants = await this.productVariantRepository.findByProductId(product.id);
    return ProductResponseDto.fromDomain(product, variants);
  }

  @Get('by-sku/:sku')
  @Public()
  @ApiOperation({ summary: 'Get product by SKU' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  async findBySku(@Param('sku') sku: string): Promise<ProductResponseDto> {
    const query = new GetProductQuery(undefined, undefined, sku);
    const product = await this.getProductHandler.execute(query);
    const variants = await this.productVariantRepository.findByProductId(product.id);
    return ProductResponseDto.fromDomain(product, variants);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update product (Admin only)' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto): Promise<ProductResponseDto> {
    const command = new UpdateProductCommand(
      id,
      dto.name,
      dto.description,
      dto.price,
      dto.costPrice,
      dto.salePrice,
      dto.stock,
      dto.lowStockThreshold,
      dto.isCommissionEligible,
      dto.images,
      dto.thumbnail,
      dto.categoryId,
      dto.status,
      dto.metaTitle,
      dto.metaDescription,
    );

    const product = await this.updateProductHandler.execute(command);
    const variants = await this.productVariantRepository.findByProductId(product.id);
    return ProductResponseDto.fromDomain(product, variants);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete product (Admin only)' })
  @ApiResponse({ status: 204 })
  async delete(@Param('id') id: string): Promise<void> {
    const command = new DeleteProductCommand(id);
    await this.deleteProductHandler.execute(command);
  }

  // ============================================
  // PRICE TIER ENDPOINTS
  // ============================================

  @Get('variants/:variantId/price-tiers')
  @Public()
  @ApiOperation({ summary: 'Get price tiers for product variant' })
  @ApiResponse({ status: 200 })
  async getPriceTiers(@Param('variantId') variantId: string) {
    const tiers = await this.priceTierRepository.findByVariantId(variantId);
    return {
      data: tiers,
    };
  }

  @Post('variants/:variantId/price-tiers')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Set price tiers for product variant (Admin only)' })
  @ApiResponse({ status: 200 })
  async setPriceTiers(
    @Param('variantId') variantId: string,
    @Body() dto: SetPriceTiersDto,
  ) {
    // Replace all tiers for this variant
    const tiers = await this.priceTierRepository.replaceForVariant(
      variantId,
      dto.tiers.map((tier) => ({
        minQuantity: tier.minQuantity,
        maxQuantity: tier.maxQuantity,
        price: tier.price,
        label: tier.label,
        order: tier.order || 0,
      })),
    );

    return {
      message: 'Price tiers updated successfully',
      data: tiers,
    };
  }

  @Get('variants/:variantId/price')
  @Public()
  @ApiOperation({ summary: 'Calculate price for quantity' })
  @ApiResponse({ status: 200 })
  async calculatePrice(
    @Param('variantId') variantId: string,
    @Query('quantity') quantity: number,
  ) {
    const qty = Number(quantity) || 1;

    // Get variant base price
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new HttpException('Variant not found', HttpStatus.NOT_FOUND);
    }

    // Try to get tier price
    const tierPrice = await this.priceTierRepository.getPriceForQuantity(variantId, qty);
    const finalPrice = tierPrice !== null ? tierPrice : Number(variant.price);

    return {
      quantity: qty,
      basePrice: Number(variant.price),
      tierPrice: tierPrice,
      finalPrice: finalPrice,
      totalPrice: finalPrice * qty,
      hasTierDiscount: tierPrice !== null && tierPrice < Number(variant.price),
    };
  }

  // ============================================
  // VARIANT MANAGEMENT ENDPOINTS
  // ============================================

  @Patch('variants/:variantId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update product variant (Admin only) - soft delete by setting active=false' })
  @ApiResponse({ status: 200 })
  async updateVariant(
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    const variant = await this.productVariantRepository.findById(variantId);
    if (!variant) {
      throw new HttpException('Không tìm thấy biến thể sản phẩm', HttpStatus.NOT_FOUND);
    }

    // Update active status (soft delete)
    if (dto.active !== undefined) {
      if (dto.active === false) {
        variant.deactivate();
      } else {
        variant.activate();
      }
      await this.productVariantRepository.update(variant);
    }

    return {
      message: dto.active === false ? 'Đã xóa biến thể sản phẩm' : 'Đã cập nhật biến thể sản phẩm',
      data: {
        id: variant.id,
        active: variant.active,
      },
    };
  }
}
