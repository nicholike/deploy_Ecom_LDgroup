import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { GetProductQuery } from './get-product.query';
import { IProductRepository } from '@core/domain/product/interfaces/product.repository.interface';
import { Product } from '@core/domain/product/entities/product.entity';

@Injectable()
export class GetProductHandler {
  constructor(
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(query: GetProductQuery): Promise<Product> {
    let product: Product | null = null;

    if (query.id) {
      product = await this.productRepository.findById(query.id);
    } else if (query.slug) {
      product = await this.productRepository.findBySlug(query.slug);
    } else if (query.sku) {
      product = await this.productRepository.findBySku(query.sku);
    }

    if (!product) {
      const identifier = query.id || query.slug || query.sku;
      throw new NotFoundException(`Product with identifier "${identifier}" not found`);
    }

    return product;
  }
}
