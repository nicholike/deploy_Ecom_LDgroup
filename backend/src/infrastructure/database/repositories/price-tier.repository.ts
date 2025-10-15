import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

export interface CreatePriceTierDto {
  productVariantId: string;
  minQuantity: number;
  maxQuantity?: number | null;
  price: number;
  label?: string;
  order?: number;
}

@Injectable()
export class PriceTierRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create price tier
   */
  async create(data: CreatePriceTierDto) {
    return this.prisma.priceTier.create({
      data: {
        productVariantId: data.productVariantId,
        minQuantity: data.minQuantity,
        maxQuantity: data.maxQuantity,
        price: data.price,
        label: data.label,
        order: data.order || 0,
      },
    });
  }

  /**
   * Create multiple price tiers
   */
  async createMany(tiers: CreatePriceTierDto[]) {
    return this.prisma.priceTier.createMany({
      data: tiers.map((tier) => ({
        productVariantId: tier.productVariantId,
        minQuantity: tier.minQuantity,
        maxQuantity: tier.maxQuantity,
        price: tier.price,
        label: tier.label,
        order: tier.order || 0,
      })),
    });
  }

  /**
   * Find price tiers by variant ID
   */
  async findByVariantId(variantId: string) {
    return this.prisma.priceTier.findMany({
      where: { productVariantId: variantId },
      orderBy: { minQuantity: 'asc' },
    });
  }

  /**
   * Get price for quantity
   */
  async getPriceForQuantity(variantId: string, quantity: number): Promise<number | null> {
    // Get all tiers sorted by minQuantity DESC to find the best match
    const tiers = await this.prisma.priceTier.findMany({
      where: { productVariantId: variantId },
      orderBy: { minQuantity: 'desc' },
    });

    // Find the matching tier
    for (const tier of tiers) {
      if (quantity >= tier.minQuantity) {
        if (!tier.maxQuantity || quantity <= tier.maxQuantity) {
          return Number(tier.price);
        }
      }
    }

    // No tier found, return null (will fallback to variant base price)
    return null;
  }

  /**
   * Delete all tiers for a variant
   */
  async deleteByVariantId(variantId: string) {
    return this.prisma.priceTier.deleteMany({
      where: { productVariantId: variantId },
    });
  }

  /**
   * Update price tier
   */
  async update(id: string, data: Partial<CreatePriceTierDto>) {
    return this.prisma.priceTier.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete price tier
   */
  async delete(id: string) {
    return this.prisma.priceTier.delete({
      where: { id },
    });
  }

  /**
   * Replace all tiers for a variant (delete old, create new)
   */
  async replaceForVariant(variantId: string, tiers: Omit<CreatePriceTierDto, 'productVariantId'>[]) {
    // Use transaction to ensure atomicity
    return this.prisma.$transaction(async (tx) => {
      // Delete old tiers
      await tx.priceTier.deleteMany({
        where: { productVariantId: variantId },
      });

      // Create new tiers
      if (tiers.length > 0) {
        await tx.priceTier.createMany({
          data: tiers.map((tier) => ({
            productVariantId: variantId,
            minQuantity: tier.minQuantity,
            maxQuantity: tier.maxQuantity,
            price: tier.price,
            label: tier.label,
            order: tier.order || 0,
          })),
        });
      }

      // Return updated tiers
      return tx.priceTier.findMany({
        where: { productVariantId: variantId },
        orderBy: { minQuantity: 'asc' },
      });
    });
  }
}
