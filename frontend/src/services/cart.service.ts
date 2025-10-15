const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export interface CartItem {
  id: string;
  productId: string;
  productVariantId?: string | null;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    thumbnail?: string;
    price?: number;
    salePrice?: number;
  };
  productVariant?: {
    id: string;
    size: string;
    price: number;
    salePrice?: number;
    stock: number;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuotaInfo {
  quotaLimit: number;
  quotaUsed: number;
  quotaRemaining: number;
  quotaPeriodStart: string | null;
  quotaPeriodEnd: string | null;
  cartQuantity?: number;
  remainingAfterCart?: number;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  quotaInfo?: QuotaInfo | null;
  createdAt: string;
  updatedAt: string;
}

export class CartService {
  private static getAuthToken(): string | null {
    const authData = localStorage.getItem('ldgroup_admin_auth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        return parsed.accessToken;
      } catch (e) {
        console.error('Failed to parse auth data:', e);
      }
    }
    return localStorage.getItem('accessToken');
  }

  private static async fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = this.getAuthToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
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

  static async getCart(): Promise<Cart> {
    return this.fetchWithAuth(`${API_BASE_URL}/cart`);
  }

  static async addToCart(data: {
    productId: string;
    productVariantId?: string;
    quantity: number;
  }): Promise<CartItem> {
    return this.fetchWithAuth(`${API_BASE_URL}/cart/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateCartItem(itemId: string, quantity: number): Promise<CartItem> {
    return this.fetchWithAuth(`${API_BASE_URL}/cart/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  }

  static async removeCartItem(itemId: string): Promise<void> {
    return this.fetchWithAuth(`${API_BASE_URL}/cart/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  static async clearCart(): Promise<void> {
    return this.fetchWithAuth(`${API_BASE_URL}/cart`, {
      method: 'DELETE',
    });
  }
}
