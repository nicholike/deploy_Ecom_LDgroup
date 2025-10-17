import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Product, ProductStatus } from '@core/domain/product/entities/product.entity';
import { ProductVariantResponseDto } from './product-variant.dto';

export class ProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  price: number;

  @ApiPropertyOptional()
  costPrice?: number;

  @ApiPropertyOptional()
  salePrice?: number;

  @ApiProperty()
  sku: string;

  @ApiProperty()
  stock: number;

  @ApiProperty()
  lowStockThreshold: number;

  @ApiProperty()
  isCommissionEligible: boolean;

  @ApiProperty()
  isSpecial: boolean;

  @ApiPropertyOptional()
  images?: string[];

  @ApiPropertyOptional()
  thumbnail?: string;

  @ApiPropertyOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  category?: {
    id: string;
    name: string;
    slug: string;
  };

  @ApiProperty({ enum: ProductStatus })
  status: ProductStatus;

  @ApiPropertyOptional()
  metaTitle?: string;

  @ApiPropertyOptional()
  metaDescription?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Computed fields
  @ApiProperty()
  isAvailable: boolean;

  @ApiProperty()
  isLowStock: boolean;

  @ApiProperty()
  effectivePrice: number;

  @ApiProperty()
  hasDiscount: boolean;

  @ApiPropertyOptional({ type: [ProductVariantResponseDto] })
  variants?: ProductVariantResponseDto[];

  static fromDomain(product: Product, variants?: any[], category?: { id: string; name: string; slug: string }): ProductResponseDto {
    const dto = new ProductResponseDto();
    dto.id = product.id;
    dto.name = product.name;
    dto.slug = product.slug.value;
    dto.description = product.description;
    dto.price = product.price?.amount ?? 0;
    dto.costPrice = product.costPrice?.amount;
    dto.salePrice = product.salePrice?.amount;
    dto.sku = product.sku?.value ?? '';
    dto.stock = product.stock ?? 0;
    dto.lowStockThreshold = product.lowStockThreshold ?? 0;
    dto.isCommissionEligible = product.isCommissionEligible;
    dto.isSpecial = product.isSpecial;
    dto.images = product.images;
    dto.thumbnail = product.thumbnail;
    dto.categoryId = product.categoryId;
    dto.category = category;
    dto.status = product.status;
    dto.metaTitle = product.metaTitle;
    dto.metaDescription = product.metaDescription;
    dto.createdAt = product.createdAt!;
    dto.updatedAt = product.updatedAt!;

    // Computed fields
    dto.isAvailable = product.isAvailable();
    dto.isLowStock = product.isLowStock();
    dto.effectivePrice = product.getEffectivePrice().amount;
    dto.hasDiscount = product.hasDiscount();

    // Variants
    if (variants) {
      dto.variants = variants.map((v) => ProductVariantResponseDto.fromDomain(v));
    }

    return dto;
  }
}
