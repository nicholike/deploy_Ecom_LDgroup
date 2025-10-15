import { ProductVariant } from '../entities/product-variant.entity';

export interface IProductVariantRepository {
  // Create
  save(variant: ProductVariant): Promise<ProductVariant>;
  saveMany(variants: ProductVariant[]): Promise<ProductVariant[]>;

  // Read
  findById(id: string): Promise<ProductVariant | null>;
  findBySku(sku: string): Promise<ProductVariant | null>;
  findByProductId(productId: string): Promise<ProductVariant[]>;
  findDefault(productId: string): Promise<ProductVariant | null>;

  // Update
  update(variant: ProductVariant): Promise<ProductVariant>;
  setAsDefault(id: string, productId: string): Promise<void>;

  // Delete
  delete(id: string): Promise<void>;
  deleteByProductId(productId: string): Promise<void>;

  // Stock operations
  decreaseStock(id: string, quantity: number): Promise<void>;
  increaseStock(id: string, quantity: number): Promise<void>;
}
