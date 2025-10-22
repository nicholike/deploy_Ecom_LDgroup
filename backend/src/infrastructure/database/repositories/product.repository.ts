import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  IProductRepository,
  ProductFilters,
  ProductListResult,
} from '@core/domain/product/interfaces/product.repository.interface';
import { Product, ProductStatus } from '@core/domain/product/entities/product.entity';
import { Slug } from '@core/domain/product/value-objects/slug.vo';
import { SKU } from '@core/domain/product/value-objects/sku.vo';
import { Price } from '@core/domain/product/value-objects/price.vo';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(product: Product): Promise<Product> {
    const data = product.toPersistence();
    const created = await this.prisma.product.create({
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        price: data.price,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        sku: data.sku,
        stock: data.stock,
        lowStockThreshold: data.lowStockThreshold,
        isCommissionEligible: data.isCommissionEligible,
        isSpecial: data.isSpecial,
        images: data.images || [],
        thumbnail: data.thumbnail,
        categoryId: data.categoryId,
        status: data.status,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
      },
    });
    return this.toDomain(created);
  }

  async findById(id: string): Promise<Product | null> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    return product ? this.toDomain(product) : null;
  }

  /**
   * Find product with variants (for quota checking)
   * Returns raw Prisma data with variants included
   */
  async findByIdWithVariants(id: string): Promise<any | null> {
    return await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
      },
    });
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
    });
    return product ? this.toDomain(product) : null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const product = await this.prisma.product.findUnique({
      where: { sku },
    });
    return product ? this.toDomain(product) : null;
  }

  async findAll(page: number, limit: number, filters?: ProductFilters): Promise<ProductListResult> {
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (filters) {
      if (filters.categoryId) {
        where.categoryId = filters.categoryId;
      }
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        where.price = {};
        if (filters.minPrice !== undefined) {
          where.price.gte = filters.minPrice;
        }
        if (filters.maxPrice !== undefined) {
          where.price.lte = filters.maxPrice;
        }
      }
      if (filters.inStock !== undefined) {
        where.stock = filters.inStock ? { gt: 0 } : { lte: 0 };
      }
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search } },
          { sku: { contains: filters.search } },
          { description: { contains: filters.search } },
        ];
      }
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products.map((p) => this.toDomain(p)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByCategoryId(categoryId: string): Promise<Product[]> {
    const products = await this.prisma.product.findMany({
      where: { categoryId },
      orderBy: { createdAt: 'desc' },
    });
    return products.map((p) => this.toDomain(p));
  }

  async update(product: Product): Promise<Product> {
    const data = product.toPersistence();
    const updated = await this.prisma.product.update({
      where: { id: data.id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        price: data.price,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        sku: data.sku,
        stock: data.stock,
        lowStockThreshold: data.lowStockThreshold,
        isCommissionEligible: data.isCommissionEligible,
        isSpecial: data.isSpecial,
        images: data.images || [],
        thumbnail: data.thumbnail,
        categoryId: data.categoryId,
        status: data.status,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        updatedAt: data.updatedAt,
      },
    });
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.product.delete({
      where: { id },
    });
  }

  async findByIds(ids: string[]): Promise<Product[]> {
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
    });
    return products.map((p) => this.toDomain(p));
  }

  async decreaseStock(id: string, quantity: number): Promise<void> {
    // Unlimited stock - do NOT decrease stock
    // Stock is unlimited for all products, so this method does nothing
    // Just update the timestamp to indicate the operation was called
    await this.prisma.product.update({
      where: { id },
      data: {
        updatedAt: new Date(),
      },
    });
  }

  async increaseStock(id: string, quantity: number): Promise<void> {
    await this.prisma.product.update({
      where: { id },
      data: {
        stock: {
          increment: quantity,
        },
      },
    });
  }

  async findLowStock(): Promise<Product[]> {
    const products = await this.prisma.product.findMany({
      where: {
        stock: {
          gt: 0,
          lte: this.prisma.product.fields.lowStockThreshold,
        },
      },
    });
    return products.map((p) => this.toDomain(p));
  }

  async findOutOfStock(): Promise<Product[]> {
    const products = await this.prisma.product.findMany({
      where: {
        stock: 0,
        status: ProductStatus.OUT_OF_STOCK,
      },
    });
    return products.map((p) => this.toDomain(p));
  }

  async countByCategory(categoryId: string): Promise<number> {
    return this.prisma.product.count({
      where: { categoryId },
    });
  }

  // Helper method to convert Prisma model to Domain entity
  private toDomain(prismaProduct: any): Product {
    // Handle null/empty slug by creating from product name
    let slug: Slug;
    if (prismaProduct.slug && prismaProduct.slug.length > 0) {
      try {
        slug = Slug.fromString(prismaProduct.slug);
      } catch (error) {
        // If slug is invalid, create from name
        slug = Slug.create(prismaProduct.name || `product-${prismaProduct.id}`);
      }
    } else {
      // If slug is null/empty, create from name
      slug = Slug.create(prismaProduct.name || `product-${prismaProduct.id}`);
    }

    return Product.fromPersistence(
      prismaProduct.id,
      {
        name: prismaProduct.name,
        slug,
        description: prismaProduct.description,
        price: prismaProduct.price ? Price.create(Number(prismaProduct.price)) : undefined,
        costPrice: prismaProduct.costPrice ? Price.create(Number(prismaProduct.costPrice)) : undefined,
        salePrice: prismaProduct.salePrice ? Price.create(Number(prismaProduct.salePrice)) : undefined,
        sku: prismaProduct.sku ? SKU.create(prismaProduct.sku) : undefined,
        stock: prismaProduct.stock,
        lowStockThreshold: prismaProduct.lowStockThreshold,
        isCommissionEligible: prismaProduct.isCommissionEligible,
        isSpecial: prismaProduct.isSpecial ?? false,
        images: Array.isArray(prismaProduct.images) ? prismaProduct.images : [],
        thumbnail: prismaProduct.thumbnail,
        categoryId: prismaProduct.categoryId,
        status: prismaProduct.status as ProductStatus,
        metaTitle: prismaProduct.metaTitle,
        metaDescription: prismaProduct.metaDescription,
      },
      new Date(prismaProduct.createdAt),
      new Date(prismaProduct.updatedAt),
    );
  }
}
