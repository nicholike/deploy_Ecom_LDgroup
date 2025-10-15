import * as crypto from 'crypto';
import { BaseEntity } from '@shared/common/base.entity';
import { SKU } from '../value-objects/sku.vo';
import { Price } from '../value-objects/price.vo';

export interface ProductVariantProps {
  productId: string;
  size: string; // "5ml", "20ml", "50ml"
  sku: SKU;
  price: Price;
  costPrice?: Price;
  salePrice?: Price;
  stock: number;
  lowStockThreshold: number;
  isDefault: boolean;
  order: number;
  active: boolean;
}

export class ProductVariant extends BaseEntity {
  private props: ProductVariantProps;

  private constructor(id: string, props: ProductVariantProps, createdAt?: Date, updatedAt?: Date) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  static create(props: ProductVariantProps, id?: string): ProductVariant {
    return new ProductVariant(id || crypto.randomUUID(), props);
  }

  static fromPersistence(
    id: string,
    props: ProductVariantProps,
    createdAt: Date,
    updatedAt: Date,
  ): ProductVariant {
    return new ProductVariant(id, props, createdAt, updatedAt);
  }

  // Getters
  get productId(): string {
    return this.props.productId;
  }

  get size(): string {
    return this.props.size;
  }

  get sku(): SKU {
    return this.props.sku;
  }

  get price(): Price {
    return this.props.price;
  }

  get costPrice(): Price | undefined {
    return this.props.costPrice;
  }

  get salePrice(): Price | undefined {
    return this.props.salePrice;
  }

  get stock(): number {
    return this.props.stock;
  }

  get lowStockThreshold(): number {
    return this.props.lowStockThreshold;
  }

  get isDefault(): boolean {
    return this.props.isDefault;
  }

  get order(): number {
    return this.props.order;
  }

  get active(): boolean {
    return this.props.active;
  }

  // Business methods
  updatePricing(data: { price?: Price; costPrice?: Price; salePrice?: Price }): void {
    if (data.price !== undefined) this.props.price = data.price;
    if (data.costPrice !== undefined) this.props.costPrice = data.costPrice;
    if (data.salePrice !== undefined) this.props.salePrice = data.salePrice;
    this.updatedAt = new Date();
  }

  updateStock(stock: number): void {
    if (stock < 0) {
      throw new Error('Stock cannot be negative');
    }
    this.props.stock = stock;
    this.updatedAt = new Date();
  }

  decreaseStock(quantity: number): void {
    // Unlimited stock - không check stock availability
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }
    // Skip stock validation for unlimited products
    // this.props.stock -= quantity;
    this.updatedAt = new Date();
  }

  increaseStock(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }
    this.props.stock += quantity;
    this.updatedAt = new Date();
  }

  setAsDefault(): void {
    this.props.isDefault = true;
    this.updatedAt = new Date();
  }

  unsetAsDefault(): void {
    this.props.isDefault = false;
    this.updatedAt = new Date();
  }

  activate(): void {
    this.props.active = true;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.active = false;
    this.updatedAt = new Date();
  }

  isAvailable(): boolean {
    // Unlimited stock - chỉ check active status
    return this.props.active;
  }

  isLowStock(): boolean {
    // Unlimited stock - không bao giờ low stock
    return false;
  }

  getEffectivePrice(): Price {
    return this.props.salePrice || this.props.price;
  }

  hasDiscount(): boolean {
    return !!this.props.salePrice && this.props.salePrice.isLessThan(this.props.price);
  }

  toPersistence(): any {
    return {
      id: this.id,
      productId: this.props.productId,
      size: this.props.size,
      sku: this.props.sku.value,
      price: this.props.price.amount,
      costPrice: this.props.costPrice?.amount,
      salePrice: this.props.salePrice?.amount,
      stock: this.props.stock,
      lowStockThreshold: this.props.lowStockThreshold,
      isDefault: this.props.isDefault,
      order: this.props.order,
      active: this.props.active,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
