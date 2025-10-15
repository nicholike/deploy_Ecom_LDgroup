import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, IsUUID, Min, IsEnum } from 'class-validator';
import { ProductStatus } from '@core/domain/product/entities/product.entity';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Premium Perfume Oil 50ml' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Luxury perfume oil with long-lasting fragrance' })
  @IsString()
  @IsOptional()
  description?: string;

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

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isCommissionEligible?: boolean;

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

  @ApiPropertyOptional({ enum: ProductStatus, example: ProductStatus.PUBLISHED })
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
}
