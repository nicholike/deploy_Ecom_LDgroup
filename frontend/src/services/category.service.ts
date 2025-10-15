import type { Category } from '../types/product.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export class CategoryService {
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

  static async getCategories(params?: {
    page?: number;
    limit?: number;
    active?: boolean;
  }): Promise<{ data: Category[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.active !== undefined) queryParams.append('active', params.active.toString());

    return this.fetchWithAuth(`${API_BASE_URL}/categories?${queryParams}`);
  }

  static async getCategoryTree(): Promise<Category[]> {
    return this.fetchWithAuth(`${API_BASE_URL}/categories/tree`);
  }

  static async getCategory(id: string): Promise<Category> {
    return this.fetchWithAuth(`${API_BASE_URL}/categories/${id}`);
  }

  static async createCategory(data: {
    name: string;
    description?: string;
    parentId?: string;
    image?: string;
    order?: number;
    active?: boolean;
  }): Promise<Category> {
    return this.fetchWithAuth(`${API_BASE_URL}/categories`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateCategory(
    id: string,
    data: {
      name?: string;
      description?: string;
      parentId?: string;
      image?: string;
      order?: number;
      active?: boolean;
    }
  ): Promise<Category> {
    return this.fetchWithAuth(`${API_BASE_URL}/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteCategory(id: string): Promise<void> {
    return this.fetchWithAuth(`${API_BASE_URL}/categories/${id}`, {
      method: 'DELETE',
    });
  }
}
