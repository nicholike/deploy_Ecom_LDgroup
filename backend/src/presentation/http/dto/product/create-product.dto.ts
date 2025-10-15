import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  Min,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '@core/domain/product/entities/product.entity';
import { CreateProductVariantDto } from './product-variant.dto';

export class CreateProductDto {
  @ApiProperty({ example: 'Premium Perfume Oil 50ml' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Luxury perfume oil with long-lasting fragrance' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 299000, description: 'Required if product has no variants' })
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

  @ApiPropertyOptional({ example: 'PRF-OIL-50ML-001', description: 'Required if product has no variants' })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ example: 100, description: 'Required if product has no variants' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  lowStockThreshold?: number;

  @ApiPropertyOptional({ example: true, default: true, description: 'All products are commission eligible by default' })
  @IsBoolean()
  @IsOptional()
  isCommissionEligible?: boolean = true;

  @ApiPropertyOptional({ example: ['image1.jpg', 'image2.jpg'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ example: 'thumbnail.jpg' })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiPropertyOptional({ example: 'uuid-category-id' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ enum: ProductStatus, example: ProductStatus.DRAFT })
  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @ApiPropertyOptional({ example: 'Premium Perfume Oil 50ml - Buy Now' })
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @ApiPropertyOptional({ example: 'Shop premium perfume oil with long-lasting fragrance' })
  @IsString()
  @IsOptional()
  metaDescription?: string;

  @ApiPropertyOptional({
    type: [CreateProductVariantDto],
    example: [
      { size: '5ml', sku: 'PRF-5ML', price: 99000, order: 1 },
      { size: '20ml', sku: 'PRF-20ML', price: 299000, isDefault: true, order: 2 },
    ],
    description: 'Stock is optional - all products have unlimited stock by default',
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants?: CreateProductVariantDto[];
}
