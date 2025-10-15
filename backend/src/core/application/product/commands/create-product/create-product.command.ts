import { ProductStatus } from '@core/domain/product/entities/product.entity';

export interface CreateProductVariantDto {
  size: string;
  sku: string;
  price: number;
  costPrice?: number;
  salePrice?: number;
  stock?: number;
  lowStockThreshold?: number;
  isDefault?: boolean;
  order?: number;
}

export class CreateProductCommand {
  constructor(
    public readonly name: string,
    public readonly description?: string,
    public readonly price?: number,
    public readonly sku?: string,
    public readonly stock?: number,
    public readonly costPrice?: number,
    public readonly salePrice?: number,
    public readonly lowStockThreshold?: number,
    public readonly isCommissionEligible?: boolean,
    public readonly images?: string[],
    public readonly thumbnail?: string,
    public readonly categoryId?: string,
    public readonly status?: ProductStatus,
    public readonly metaTitle?: string,
    public readonly metaDescription?: string,
    public readonly variants?: CreateProductVariantDto[],
  ) {}
}
