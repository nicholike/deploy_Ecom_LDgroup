const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export interface Order {
  id: string;
  orderNumber: string;
  pendingNumber?: string; // For pending orders (before payment confirmation)
  userId: string;
  subtotal: number;
  shippingFee: number;
  tax: number;
  discount: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  shippingAddress?: any;
  shippingMethod?: string;
  paymentMethod?: string;
  customerNote?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string; // For pending orders
  items: Array<{
    id: string;
    productId: string;
    productVariantId?: string;
    quantity: number;
    price: number;
    subtotal: number;
    isFreeGift?: boolean;
    product: {
      id: string;
      name: string;
      slug: string;
      thumbnail?: string;
    };
    productVariant?: {
      id: string;
      size: string;
    };
  }>;
  user?: {
    id: string;
    email: string;
    username: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    sponsorId?: string | null;
    sponsor?: {
      id: string;
      username: string;
      firstName?: string;
      lastName?: string;
    } | null;
  };
}

export class OrderService {
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

  static async createOrder(data: {
    shippingAddress?: any;
    shippingMethod?: string;
    paymentMethod?: string;
    customerNote?: string;
    freeGifts?: Array<{
      productId: string;
      variantId: string;
      quantity: number;
    }>;
  }): Promise<Order> {
    return this.fetchWithAuth(`${API_BASE_URL}/orders`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async getMyOrders(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: Order[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return this.fetchWithAuth(`${API_BASE_URL}/orders?${queryParams}`);
  }

  static async getAllOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{ data: Order[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);

    return this.fetchWithAuth(`${API_BASE_URL}/orders/all?${queryParams}`);
  }

  static async getOrder(id: string): Promise<Order> {
    return this.fetchWithAuth(`${API_BASE_URL}/orders/${id}`);
  }

  static async updateOrderStatus(id: string, status: string): Promise<Order> {
    return this.fetchWithAuth(`${API_BASE_URL}/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  static async updatePaymentStatus(id: string, paymentStatus: string): Promise<Order> {
    return this.fetchWithAuth(`${API_BASE_URL}/orders/${id}/payment-status`, {
      method: 'PUT',
      body: JSON.stringify({ paymentStatus }),
    });
  }

  static async cancelOrder(id: string): Promise<{
    message: string;
    order: Order;
    refunded: boolean;
    refundAmount: number;
    quotaReturned: number;
  }> {
    return this.fetchWithAuth(`${API_BASE_URL}/orders/${id}/cancel`, {
      method: 'POST',
    });
  }

  static async adminCancelOrder(id: string): Promise<{
    message: string;
    order: Order;
    refunded: boolean;
    refundAmount: number;
    quotaReturned: number;
  }> {
    return this.fetchWithAuth(`${API_BASE_URL}/orders/${id}/admin-cancel`, {
      method: 'POST',
    });
  }
}
