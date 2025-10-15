import { ProductStatus } from '@core/domain/product/entities/product.entity';

export class ListProductsQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly categoryId?: string,
    public readonly status?: ProductStatus,
    public readonly minPrice?: number,
    public readonly maxPrice?: number,
    public readonly inStock?: boolean,
    public readonly search?: string,
  ) {}
}
