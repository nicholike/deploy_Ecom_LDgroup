import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IProductVariantRepository } from '@core/domain/product/interfaces/product-variant.repository.interface';
import { ProductVariant } from '@core/domain/product/entities/product-variant.entity';
import { SKU } from '@core/domain/product/value-objects/sku.vo';
import { Price } from '@core/domain/product/value-objects/price.vo';

@Injectable()
export class ProductVariantRepository implements IProductVariantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(variant: ProductVariant): Promise<ProductVariant> {
    const data = variant.toPersistence();
    const created = await this.prisma.productVariant.create({
      data: {
        id: data.id,
        productId: data.productId,
        size: data.size,
        sku: data.sku,
        price: data.price,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        stock: data.stock,
        lowStockThreshold: data.lowStockThreshold,
        isDefault: data.isDefault,
        order: data.order,
        active: data.active,
      },
    });
    return this.toDomain(created);
  }

  async saveMany(variants: ProductVariant[]): Promise<ProductVariant[]> {
    const data = variants.map((v) => v.toPersistence());
    await this.prisma.productVariant.createMany({
      data: data.map((d) => ({
        id: d.id,
        productId: d.productId,
        size: d.size,
        sku: d.sku,
        price: d.price,
        costPrice: d.costPrice,
        salePrice: d.salePrice,
        stock: d.stock,
        lowStockThreshold: d.lowStockThreshold,
        isDefault: d.isDefault,
        order: d.order,
        active: d.active,
      })),
    });

    // Return created variants
    const created = await this.findByProductId(variants[0].productId);
    return created;
  }

  async findById(id: string): Promise<ProductVariant | null> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
    });
    return variant ? this.toDomain(variant) : null;
  }

  async findBySku(sku: string): Promise<ProductVariant | null> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { sku },
    });
    return variant ? this.toDomain(variant) : null;
  }

  async findByProductId(productId: string): Promise<ProductVariant[]> {
    const variants = await this.prisma.productVariant.findMany({
      where: { productId },
      orderBy: { order: 'asc' },
    });
    return variants.map((v) => this.toDomain(v));
  }

  async findDefault(productId: string): Promise<ProductVariant | null> {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        productId,
        isDefault: true,
      },
    });
    return variant ? this.toDomain(variant) : null;
  }

  async update(variant: ProductVariant): Promise<ProductVariant> {
    const data = variant.toPersistence();
    const updated = await this.prisma.productVariant.update({
      where: { id: data.id },
      data: {
        size: data.size,
        sku: data.sku,
        price: data.price,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        stock: data.stock,
        lowStockThreshold: data.lowStockThreshold,
        isDefault: data.isDefault,
        order: data.order,
        active: data.active,
        updatedAt: data.updatedAt,
      },
    });
    return this.toDomain(updated);
  }

  async setAsDefault(id: string, productId: string): Promise<void> {
    // Unset all defaults for this product
    await this.prisma.productVariant.updateMany({
      where: { productId },
      data: { isDefault: false },
    });

    // Set new default
    await this.prisma.productVariant.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.productVariant.delete({
      where: { id },
    });
  }

  async deleteByProductId(productId: string): Promise<void> {
    await this.prisma.productVariant.deleteMany({
      where: { productId },
    });
  }

  async decreaseStock(id: string, quantity: number): Promise<void> {
    // Unlimited stock - do NOT decrease stock
    // Stock is unlimited for all products, so this method does nothing
    // Just update the timestamp to indicate the operation was called
    await this.prisma.productVariant.update({
      where: { id },
      data: {
        updatedAt: new Date(),
      },
    });
  }

  async increaseStock(id: string, quantity: number): Promise<void> {
    await this.prisma.productVariant.update({
      where: { id },
      data: {
        stock: {
          increment: quantity,
        },
      },
    });
  }

  private toDomain(prismaVariant: any): ProductVariant {
    return ProductVariant.fromPersistence(
      prismaVariant.id,
      {
        productId: prismaVariant.productId,
        size: prismaVariant.size,
        sku: SKU.create(prismaVariant.sku),
        price: Price.create(Number(prismaVariant.price)),
        costPrice: prismaVariant.costPrice ? Price.create(Number(prismaVariant.costPrice)) : undefined,
        salePrice: prismaVariant.salePrice ? Price.create(Number(prismaVariant.salePrice)) : undefined,
        stock: prismaVariant.stock,
        lowStockThreshold: prismaVariant.lowStockThreshold,
        isDefault: prismaVariant.isDefault,
        order: prismaVariant.order,
        active: prismaVariant.active,
      },
      new Date(prismaVariant.createdAt),
      new Date(prismaVariant.updatedAt),
    );
  }
}
