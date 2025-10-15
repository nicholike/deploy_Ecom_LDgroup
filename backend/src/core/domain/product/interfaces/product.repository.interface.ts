import { Product, ProductStatus } from '../entities/product.entity';

export interface ProductFilters {
  categoryId?: string;
  status?: ProductStatus;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  search?: string; // Search by name, SKU, description
}

export interface ProductListResult {
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IProductRepository {
  // Create
  save(product: Product): Promise<Product>;

  // Read
  findById(id: string): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
  findBySku(sku: string): Promise<Product | null>;
  findAll(page: number, limit: number, filters?: ProductFilters): Promise<ProductListResult>;
  findByCategoryId(categoryId: string): Promise<Product[]>;

  // Update
  update(product: Product): Promise<Product>;

  // Delete
  delete(id: string): Promise<void>;

  // Bulk operations
  findByIds(ids: string[]): Promise<Product[]>;
  decreaseStock(id: string, quantity: number): Promise<void>;
  increaseStock(id: string, quantity: number): Promise<void>;

  // Business queries
  findLowStock(): Promise<Product[]>;
  findOutOfStock(): Promise<Product[]>;
  countByCategory(categoryId: string): Promise<number>;
}
