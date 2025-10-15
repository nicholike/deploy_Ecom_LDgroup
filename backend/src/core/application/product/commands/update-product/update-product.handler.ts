import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { UpdateProductCommand } from './update-product.command';
import { IProductRepository } from '@core/domain/product/interfaces/product.repository.interface';
import { ICategoryRepository } from '@core/domain/product/interfaces/category.repository.interface';
import { Product } from '@core/domain/product/entities/product.entity';
import { Price } from '@core/domain/product/value-objects/price.vo';

@Injectable()
export class UpdateProductHandler {
  constructor(
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
    @Inject('ICategoryRepository')
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(command: UpdateProductCommand): Promise<Product> {
    // 1. Find existing product
    const product = await this.productRepository.findById(command.id);
    if (!product) {
      throw new NotFoundException(`Product with ID "${command.id}" not found`);
    }

    // 2. Validate category if provided
    if (command.categoryId !== undefined) {
      if (command.categoryId) {
        const category = await this.categoryRepository.findById(command.categoryId);
        if (!category) {
          throw new NotFoundException(`Category with ID "${command.categoryId}" not found`);
        }
        if (!category.isActive()) {
          throw new ConflictException(`Category "${category.name}" is not active`);
        }
      }
    }

    // 3. Update basic info
    if (command.name !== undefined || command.description !== undefined || command.categoryId !== undefined) {
      product.updateBasicInfo({
        name: command.name,
        description: command.description,
        categoryId: command.categoryId,
        metaTitle: command.metaTitle,
        metaDescription: command.metaDescription,
      });
    }

    // 4. Update pricing
    if (command.price !== undefined || command.costPrice !== undefined || command.salePrice !== undefined) {
      const price = command.price !== undefined ? Price.create(command.price) : undefined;
      const costPrice = command.costPrice !== undefined ? Price.create(command.costPrice) : undefined;
      const salePrice = command.salePrice !== undefined ? Price.create(command.salePrice) : undefined;

      // Validate sale price (only for products without variants)
      const effectivePrice = price || product.price;
      if (salePrice && effectivePrice && !salePrice.isLessThan(effectivePrice)) {
        throw new ConflictException('Sale price must be less than regular price');
      }

      product.updatePricing({ price, costPrice, salePrice });
    }

    // 5. Update inventory
    if (command.stock !== undefined || command.lowStockThreshold !== undefined) {
      product.updateInventory({
        stock: command.stock,
        lowStockThreshold: command.lowStockThreshold,
      });
    }

    // 6. Update images
    if (command.images !== undefined || command.thumbnail !== undefined) {
      product.updateImages(command.images || product.images || [], command.thumbnail);
    }

    // 7. Update commission eligibility
    if (command.isCommissionEligible !== undefined) {
      product.setCommissionEligibility(command.isCommissionEligible);
    }

    // 8. Update status
    if (command.status !== undefined) {
      if (command.status === 'PUBLISHED' && product.status !== 'PUBLISHED') {
        product.publish();
      } else if (command.status === 'DRAFT' && product.status === 'PUBLISHED') {
        product.unpublish();
      } else if (command.status === 'DISCONTINUED') {
        product.discontinue();
      }
    }

    // 9. Persist changes
    return await this.productRepository.update(product);
  }
}
