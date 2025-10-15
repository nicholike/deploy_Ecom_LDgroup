import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { ProductVariant } from '@core/domain/product/entities/product-variant.entity';

export class CreateProductVariantDto {
  @ApiProperty({ example: '20ml' })
  @IsString()
  @IsNotEmpty()
  size: string;

  @ApiProperty({ example: 'PRF-OIL-20ML' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 299000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 150000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ example: 249000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  salePrice?: number;

  @ApiPropertyOptional({ example: 999999, description: 'Stock is unlimited by default - this field is for tracking only' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  lowStockThreshold?: number;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateProductVariantDto {
  @ApiPropertyOptional({ example: '20ml' })
  @IsString()
  @IsOptional()
  size?: string;

  @ApiPropertyOptional({ example: 299000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 150000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ example: 249000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  salePrice?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  lowStockThreshold?: number;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class ProductVariantResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  size: string;

  @ApiProperty()
  sku: string;

  @ApiProperty()
  price: number;

  @ApiPropertyOptional()
  costPrice?: number;

  @ApiPropertyOptional()
  salePrice?: number;

  @ApiProperty()
  stock: number;

  @ApiProperty()
  lowStockThreshold: number;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  order: number;

  @ApiProperty()
  active: boolean;

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

  static fromDomain(variant: ProductVariant): ProductVariantResponseDto {
    const dto = new ProductVariantResponseDto();
    dto.id = variant.id;
    dto.productId = variant.productId;
    dto.size = variant.size;
    dto.sku = variant.sku.value;
    dto.price = variant.price.amount;
    dto.costPrice = variant.costPrice?.amount;
    dto.salePrice = variant.salePrice?.amount;
    dto.stock = variant.stock;
    dto.lowStockThreshold = variant.lowStockThreshold;
    dto.isDefault = variant.isDefault;
    dto.order = variant.order;
    dto.active = variant.active;
    dto.createdAt = variant.createdAt!;
    dto.updatedAt = variant.updatedAt!;

    // Computed
    dto.isAvailable = variant.isAvailable();
    dto.isLowStock = variant.isLowStock();
    dto.effectivePrice = variant.getEffectivePrice().amount;
    dto.hasDiscount = variant.hasDiscount();

    return dto;
  }
}
