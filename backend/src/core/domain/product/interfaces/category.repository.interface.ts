import { Category } from '../entities/category.entity';

export interface CategoryFilters {
  parentId?: string | null; // null = root categories
  active?: boolean;
  search?: string;
}

export interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
}

export interface CategoryListResult {
  data: Category[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ICategoryRepository {
  // Create
  save(category: Category): Promise<Category>;

  // Read
  findById(id: string): Promise<Category | null>;
  findBySlug(slug: string): Promise<Category | null>;
  findAll(page: number, limit: number, filters?: CategoryFilters): Promise<CategoryListResult>;
  findByParentId(parentId: string | null): Promise<Category[]>;
  findTree(): Promise<CategoryWithChildren[]>;

  // Update
  update(category: Category): Promise<Category>;

  // Delete
  delete(id: string): Promise<void>;

  // Business queries
  hasProducts(id: string): Promise<boolean>;
  hasChildren(id: string): Promise<boolean>;
  findRootCategories(): Promise<Category[]>;
  findActiveCategories(): Promise<Category[]>;
}
