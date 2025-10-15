import { ProductStatus } from '@core/domain/product/entities/product.entity';

export class UpdateProductCommand {
  constructor(
    public readonly id: string,
    public readonly name?: string,
    public readonly description?: string,
    public readonly price?: number,
    public readonly costPrice?: number,
    public readonly salePrice?: number,
    public readonly stock?: number,
    public readonly lowStockThreshold?: number,
    public readonly isCommissionEligible?: boolean,
    public readonly images?: string[],
    public readonly thumbnail?: string,
    public readonly categoryId?: string,
    public readonly status?: ProductStatus,
    public readonly metaTitle?: string,
    public readonly metaDescription?: string,
  ) {}
}
