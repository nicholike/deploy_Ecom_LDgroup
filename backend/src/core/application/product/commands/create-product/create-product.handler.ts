import { Injectable, Inject, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateProductCommand } from './create-product.command';
import { IProductRepository } from '@core/domain/product/interfaces/product.repository.interface';
import { ICategoryRepository } from '@core/domain/product/interfaces/category.repository.interface';
import { IProductVariantRepository } from '@core/domain/product/interfaces/product-variant.repository.interface';
import { Product, ProductStatus } from '@core/domain/product/entities/product.entity';
import { ProductVariant } from '@core/domain/product/entities/product-variant.entity';
import { Slug } from '@core/domain/product/value-objects/slug.vo';
import { SKU } from '@core/domain/product/value-objects/sku.vo';
import { Price } from '@core/domain/product/value-objects/price.vo';

@Injectable()
export class CreateProductHandler {
  constructor(
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
    @Inject('ICategoryRepository')
    private readonly categoryRepository: ICategoryRepository,
    @Inject('IProductVariantRepository')
    private readonly productVariantRepository: IProductVariantRepository,
  ) {}

  async execute(command: CreateProductCommand): Promise<Product> {
    const hasVariants = command.variants && command.variants.length > 0;

    // 1. Validate: If no variants, require price, sku (stock is unlimited by default)
    if (!hasVariants) {
      if (!command.price || !command.sku) {
        throw new BadRequestException('Products without variants must have price and sku');
      }
    }

    // 2. Validate SKU uniqueness (only for products without variants)
    if (!hasVariants && command.sku) {
      const existingSku = await this.productRepository.findBySku(command.sku);
      if (existingSku) {
        throw new ConflictException(`Product with SKU "${command.sku}" already exists`);
      }
    }

    // 3. Validate variant SKUs uniqueness
    if (hasVariants) {
      for (const variant of command.variants!) {
        const existingVariantSku = await this.productVariantRepository.findBySku(variant.sku);
        if (existingVariantSku) {
          throw new ConflictException(`Variant with SKU "${variant.sku}" already exists`);
        }
      }

      // Validate at least one variant is default
      const hasDefault = command.variants!.some((v) => v.isDefault);
      if (!hasDefault) {
        // Auto-set first variant as default
        command.variants![0].isDefault = true;
      }
    }

    // 4. Generate and validate slug uniqueness
    let slug = Slug.create(command.name);
    const existingSlug = await this.productRepository.findBySlug(slug.value);
    if (existingSlug) {
      // Auto-append timestamp if slug exists
      slug = Slug.fromString(`${slug.value}-${Date.now()}`);
    }

    // 5. Validate category if provided
    if (command.categoryId) {
      const category = await this.categoryRepository.findById(command.categoryId);
      if (!category) {
        throw new NotFoundException(`Category with ID "${command.categoryId}" not found`);
      }
      if (!category.isActive()) {
        throw new ConflictException(`Category "${category.name}" is not active`);
      }
    }

    // 6. Create value objects (optional for products with variants)
    const sku = command.sku ? SKU.create(command.sku) : undefined;
    const price = command.price ? Price.create(command.price) : undefined;
    const costPrice = command.costPrice !== undefined ? Price.create(command.costPrice) : undefined;
    const salePrice = command.salePrice !== undefined ? Price.create(command.salePrice) : undefined;

    // 7. Validate sale price is less than price (only if both provided)
    if (salePrice && price && !salePrice.isLessThan(price)) {
      throw new ConflictException('Sale price must be less than regular price');
    }

    // 8. Create product entity
    const product = Product.create({
      name: command.name,
      slug,
      description: command.description,
      price,
      costPrice,
      salePrice,
      sku,
      stock: command.stock ?? 999999, // Unlimited stock by default
      lowStockThreshold: command.lowStockThreshold ?? 10,
      isCommissionEligible: command.isCommissionEligible ?? true,
      isSpecial: command.isSpecial ?? false,
      images: command.images,
      thumbnail: command.thumbnail,
      categoryId: command.categoryId,
      status: command.status ?? ProductStatus.DRAFT,
      metaTitle: command.metaTitle,
      metaDescription: command.metaDescription,
    });

    // 9. Persist product to database
    const savedProduct = await this.productRepository.save(product);

    // 10. Create variants if provided
    if (hasVariants) {
      const variantEntities = command.variants!.map((variantDto, index) => {
        return ProductVariant.create({
          productId: savedProduct.id,
          size: variantDto.size,
          sku: SKU.create(variantDto.sku),
          price: Price.create(variantDto.price),
          costPrice: variantDto.costPrice ? Price.create(variantDto.costPrice) : undefined,
          salePrice: variantDto.salePrice ? Price.create(variantDto.salePrice) : undefined,
          stock: variantDto.stock ?? 999999, // Unlimited stock by default
          lowStockThreshold: variantDto.lowStockThreshold ?? 10,
          isDefault: variantDto.isDefault ?? false,
          order: variantDto.order ?? index + 1,
          active: true,
        });
      });

      await this.productVariantRepository.saveMany(variantEntities);
    }

    return savedProduct;
  }
}
