import * as crypto from 'crypto';
import { BaseEntity } from '@shared/common/base.entity';
import { Slug } from '../value-objects/slug.vo';
import { SKU } from '../value-objects/sku.vo';
import { Price } from '../value-objects/price.vo';

export enum ProductStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  DISCONTINUED = 'DISCONTINUED',
}

export interface ProductProps {
  name: string;
  slug: Slug;
  description?: string;
  // Optional for products with variants
  price?: Price;
  costPrice?: Price;
  salePrice?: Price;
  sku?: SKU;
  stock?: number;
  lowStockThreshold?: number;
  isCommissionEligible: boolean;
  images?: string[];
  thumbnail?: string;
  categoryId?: string;
  status: ProductStatus;
  metaTitle?: string;
  metaDescription?: string;
}

export class Product extends BaseEntity {
  private props: ProductProps;

  private constructor(id: string, props: ProductProps, createdAt?: Date, updatedAt?: Date) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  // Factory method to create new product
  static create(props: ProductProps, id?: string): Product {
    return new Product(id || crypto.randomUUID(), props);
  }

  // Factory method to reconstitute from database
  static fromPersistence(id: string, props: ProductProps, createdAt: Date, updatedAt: Date): Product {
    return new Product(id, props, createdAt, updatedAt);
  }

  // Getters
  get name(): string {
    return this.props.name;
  }

  get slug(): Slug {
    return this.props.slug;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get price(): Price | undefined {
    return this.props.price;
  }

  get costPrice(): Price | undefined {
    return this.props.costPrice;
  }

  get salePrice(): Price | undefined {
    return this.props.salePrice;
  }

  get sku(): SKU | undefined {
    return this.props.sku;
  }

  get stock(): number | undefined {
    return this.props.stock;
  }

  get lowStockThreshold(): number | undefined {
    return this.props.lowStockThreshold;
  }

  get isCommissionEligible(): boolean {
    return this.props.isCommissionEligible;
  }

  get images(): string[] | undefined {
    return this.props.images;
  }

  get thumbnail(): string | undefined {
    return this.props.thumbnail;
  }

  get categoryId(): string | undefined {
    return this.props.categoryId;
  }

  get status(): ProductStatus {
    return this.props.status;
  }

  get metaTitle(): string | undefined {
    return this.props.metaTitle;
  }

  get metaDescription(): string | undefined {
    return this.props.metaDescription;
  }

  // Business methods
  updateBasicInfo(data: {
    name?: string;
    description?: string;
    categoryId?: string;
    metaTitle?: string;
    metaDescription?: string;
  }): void {
    if (data.name !== undefined) {
      this.props.name = data.name;
      // Auto-update slug when name changes
      this.props.slug = Slug.create(data.name);
    }
    if (data.description !== undefined) this.props.description = data.description;
    if (data.categoryId !== undefined) this.props.categoryId = data.categoryId;
    if (data.metaTitle !== undefined) this.props.metaTitle = data.metaTitle;
    if (data.metaDescription !== undefined) this.props.metaDescription = data.metaDescription;
    this.updatedAt = new Date();
  }

  updatePricing(data: { price?: Price; costPrice?: Price; salePrice?: Price }): void {
    if (data.price !== undefined) this.props.price = data.price;
    if (data.costPrice !== undefined) this.props.costPrice = data.costPrice;
    if (data.salePrice !== undefined) this.props.salePrice = data.salePrice;
    this.updatedAt = new Date();
  }

  updateInventory(data: { stock?: number; lowStockThreshold?: number }): void {
    if (data.stock !== undefined) {
      if (data.stock < 0) {
        throw new Error('Stock cannot be negative');
      }
      this.props.stock = data.stock;
      // Unlimited stock - không auto-update status based on stock
    }
    if (data.lowStockThreshold !== undefined) {
      if (data.lowStockThreshold < 0) {
        throw new Error('Low stock threshold cannot be negative');
      }
      this.props.lowStockThreshold = data.lowStockThreshold;
    }
    this.updatedAt = new Date();
  }

  updateImages(images: string[], thumbnail?: string): void {
    this.props.images = images;
    if (thumbnail !== undefined) {
      this.props.thumbnail = thumbnail;
    }
    this.updatedAt = new Date();
  }

  publish(): void {
    if (this.props.status === ProductStatus.DRAFT) {
      // Unlimited stock - không check stock khi publish
      this.props.status = ProductStatus.PUBLISHED;
      this.updatedAt = new Date();
    }
  }

  unpublish(): void {
    if (this.props.status === ProductStatus.PUBLISHED) {
      this.props.status = ProductStatus.DRAFT;
      this.updatedAt = new Date();
    }
  }

  discontinue(): void {
    this.props.status = ProductStatus.DISCONTINUED;
    this.updatedAt = new Date();
  }

  setCommissionEligibility(eligible: boolean): void {
    this.props.isCommissionEligible = eligible;
    this.updatedAt = new Date();
  }

  decreaseStock(quantity: number): void {
    // Unlimited stock - không decrease stock
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }
    // Skip stock validation and decrease for unlimited products
    this.updatedAt = new Date();
  }

  increaseStock(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }
    if (this.props.stock === undefined) {
      throw new Error('Cannot increase stock for products with variants');
    }
    this.props.stock += quantity;

    // Auto-restore status if stock was out
    if (this.props.stock > 0 && this.props.status === ProductStatus.OUT_OF_STOCK) {
      this.props.status = ProductStatus.PUBLISHED;
    }

    this.updatedAt = new Date();
  }

  isAvailable(): boolean {
    // Unlimited stock - chỉ check status
    return this.props.status === ProductStatus.PUBLISHED;
  }

  isLowStock(): boolean {
    // Unlimited stock - không bao giờ low stock
    return false;
  }

  getEffectivePrice(): Price {
    if (!this.props.price) {
      // For products with variants, price comes from variant
      return Price.create(0);
    }
    return this.props.salePrice || this.props.price;
  }

  hasDiscount(): boolean {
    if (!this.props.price || !this.props.salePrice) {
      return false;
    }
    return this.props.salePrice.isLessThan(this.props.price);
  }

  // Convert to plain object for persistence
  toPersistence(): any {
    return {
      id: this.id,
      name: this.props.name,
      slug: this.props.slug.value,
      description: this.props.description,
      price: this.props.price?.amount,
      costPrice: this.props.costPrice?.amount,
      salePrice: this.props.salePrice?.amount,
      sku: this.props.sku?.value,
      stock: this.props.stock,
      lowStockThreshold: this.props.lowStockThreshold,
      isCommissionEligible: this.props.isCommissionEligible,
      images: this.props.images,
      thumbnail: this.props.thumbnail,
      categoryId: this.props.categoryId,
      status: this.props.status,
      metaTitle: this.props.metaTitle,
      metaDescription: this.props.metaDescription,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
