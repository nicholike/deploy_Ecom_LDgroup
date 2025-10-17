import type {
  CreateProductRequest,
  PriceTier,
  PriceTierRequest,
  ProductResponse,
  ProductVariant,
  UpdateProductRequest,
  VariantPriceCalculation,
} from '../types/product.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export class ProductService {
  private static getAuthToken(): string | null {
    // Try to get token from ldgroup_admin_auth first
    const authData = localStorage.getItem('ldgroup_admin_auth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        return parsed.accessToken;
      } catch (e) {
        console.error('Failed to parse auth data:', e);
      }
    }
    // Fallback to direct accessToken
    return localStorage.getItem('accessToken');
  }

  private static async fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = this.getAuthToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const hasContent = response.status !== 204;
    let data: any = null;

    if (hasContent) {
      const text = await response.text();

      if (text) {
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error('Failed to parse response JSON:', parseError);
          throw new Error('Received malformed response from server');
        }
      }
    }

    if (!response.ok) {
      console.error('API Error:', data);

      if (response.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('ldgroup_admin_auth');
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }

      let errorMessage: string | undefined;

      if (data && typeof data === 'object') {
        const payload = data as Record<string, any>;
        const messageSource = payload.error?.message ?? payload.message;

        if (Array.isArray(messageSource)) {
          errorMessage = messageSource.join('\n');
        } else if (typeof messageSource === 'string') {
          errorMessage = messageSource;
        }
      }

      if (!errorMessage) {
        errorMessage = `API request failed with status ${response.status}`;
      }

      throw new Error(errorMessage);
    }

    if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
      const envelope = data as { success: boolean; data: unknown; message?: unknown };

      if (!envelope.success) {
        const message =
          (typeof envelope.message === 'string' && envelope.message) ||
          'API request failed';
        throw new Error(message);
      }

      return envelope.data;
    }

    return data;
  }

  static async createProduct(data: CreateProductRequest): Promise<ProductResponse> {
    return this.fetchWithAuth(`${API_BASE_URL}/products`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async getProducts(params?: {
    page?: number;
    limit?: number;
    categoryId?: string;
    status?: string;
  }): Promise<{ data: ProductResponse[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.categoryId) queryParams.append('categoryId', params.categoryId);
    if (params?.status) queryParams.append('status', params.status);

    return this.fetchWithAuth(`${API_BASE_URL}/products?${queryParams}`);
  }

  static async getProduct(id: string): Promise<ProductResponse> {
    return this.fetchWithAuth(`${API_BASE_URL}/products/${id}`);
  }

  static async updateProduct(id: string, data: UpdateProductRequest): Promise<ProductResponse> {
    return this.fetchWithAuth(`${API_BASE_URL}/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteProduct(id: string): Promise<void> {
    return this.fetchWithAuth(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE',
    });
  }

  static async getVariantPriceTiers(variantId: string): Promise<PriceTier[]> {
    const result = await this.fetchWithAuth(`${API_BASE_URL}/products/variants/${variantId}/price-tiers`);

    if (Array.isArray(result)) {
      return result;
    }

    if (result && typeof result === 'object' && Array.isArray((result as any).data)) {
      return (result as { data: PriceTier[] }).data;
    }

    return [];
  }

  static async setVariantPriceTiers(
    variantId: string,
    tiers: PriceTierRequest[],
  ): Promise<PriceTier[]> {
    const sanitizedTiers = tiers
      .filter((tier) => {
        const minQuantity = Number(tier.minQuantity);
        const price = Number(tier.price);
        return Number.isFinite(minQuantity) && minQuantity > 0 && Number.isFinite(price) && price >= 0;
      })
      .map((tier, index) => ({
        minQuantity: Number(tier.minQuantity),
        maxQuantity:
          tier.maxQuantity === undefined || tier.maxQuantity === null
            ? null
            : Number(tier.maxQuantity),
        price: Number(tier.price),
        label: tier.label && tier.label.trim().length > 0 ? tier.label.trim() : undefined,
        order: tier.order ?? index,
      }));

    const result = await this.fetchWithAuth(
      `${API_BASE_URL}/products/variants/${variantId}/price-tiers`,
      {
        method: 'POST',
        body: JSON.stringify({
          tiers: sanitizedTiers,
        }),
      },
    );

    if (Array.isArray(result)) {
      return result;
    }

    if (result && typeof result === 'object' && Array.isArray((result as any).data)) {
      return (result as { data: PriceTier[] }).data;
    }

    return [];
  }

  static async calculateVariantPrice(
    variantId: string,
    quantity: number,
  ): Promise<VariantPriceCalculation> {
    return this.fetchWithAuth(
      `${API_BASE_URL}/products/variants/${variantId}/price?quantity=${encodeURIComponent(quantity)}`,
    );
  }

  /**
   * Soft delete variant by setting active = false
   */
  static async deleteVariant(variantId: string): Promise<void> {
    return this.fetchWithAuth(`${API_BASE_URL}/products/variants/${variantId}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: false }),
    });
  }

  /**
   * Restore variant by setting active = true
   */
  static async restoreVariant(variantId: string): Promise<void> {
    return this.fetchWithAuth(`${API_BASE_URL}/products/variants/${variantId}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: true }),
    });
  }

  static async addVariant(productId: string, variant: Partial<ProductVariant>): Promise<ProductVariant> {
    return this.fetchWithAuth(`${API_BASE_URL}/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(variant),
    });
  }

  /**
   * Get price tiers for a variant
   */
  static async getPriceTiers(variantId: string): Promise<PriceTier[]> {
    return this.fetchWithAuth(`${API_BASE_URL}/products/variants/${variantId}/price-tiers`, {
      method: 'GET',
    });
  }

  /**
   * Set price tiers for a variant
   */
  static async setPriceTiers(variantId: string, tiers: any[]): Promise<void> {
    return this.fetchWithAuth(`${API_BASE_URL}/products/variants/${variantId}/price-tiers`, {
      method: 'POST',
      body: JSON.stringify({ tiers }),
    });
  }
}
