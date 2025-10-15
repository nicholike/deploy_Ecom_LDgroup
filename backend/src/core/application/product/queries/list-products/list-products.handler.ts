import { Injectable, Inject } from '@nestjs/common';
import { ListProductsQuery } from './list-products.query';
import {
  IProductRepository,
  ProductListResult,
} from '@core/domain/product/interfaces/product.repository.interface';

@Injectable()
export class ListProductsHandler {
  constructor(
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(query: ListProductsQuery): Promise<ProductListResult> {
    return await this.productRepository.findAll(query.page, query.limit, {
      categoryId: query.categoryId,
      status: query.status,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      inStock: query.inStock,
      search: query.search,
    });
  }
}
