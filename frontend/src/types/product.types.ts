export enum ProductStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  DISCONTINUED = 'DISCONTINUED',
}

export interface PriceTier {
  id?: string;
  minQuantity: number;
  maxQuantity?: number | null;
  price: number;
  label?: string | null;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PriceTierRequest {
  minQuantity: number;
  maxQuantity?: number | null;
  price: number;
  label?: string;
  order?: number;
}

export interface VariantPriceCalculation {
  quantity: number;
  basePrice: number;
  tierPrice: number | null;
  finalPrice: number;
  totalPrice: number;
  hasTierDiscount: boolean;
}

export interface ProductVariant {
  id?: string;
  size: string;
  sku: string;
  price: number;
  costPrice?: number;
  salePrice?: number;
  stock: number;
  lowStockThreshold?: number;
  isDefault?: boolean;
  order?: number;
  active?: boolean;
  priceTiers?: PriceTier[];
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  price?: number;
  costPrice?: number;
  salePrice?: number;
  sku?: string;
  stock?: number;
  lowStockThreshold?: number;
  images?: string[];
  thumbnail?: string;
  categoryId?: string;
  status?: ProductStatus;
  metaTitle?: string;
  metaDescription?: string;
  variants?: ProductVariant[];
  isCommissionEligible?: boolean;
}

export interface ProductResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price?: number;
  costPrice?: number;
  salePrice?: number;
  sku?: string;
  stock?: number;
  lowStockThreshold?: number;
  isCommissionEligible: boolean;
  images?: string[];
  thumbnail?: string;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  status: ProductStatus;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
  isAvailable?: boolean;
  isLowStock?: boolean;
  effectivePrice?: number;
  hasDiscount?: boolean;
  variants?: ProductVariant[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  active: boolean;
}

export type UpdateProductRequest = Partial<Omit<CreateProductRequest, 'variants'>> & {
  variants?: never;
};
