const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export interface UploadResponse {
  message: string;
  url: string;
  filename?: string;
}

export class UploadService {
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
      ...options.headers,
    };

    if (options.body instanceof FormData) {
      if ('Content-Type' in headers) {
        delete (headers as Record<string, unknown>)['Content-Type'];
      }
    }

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

  /**
   * Upload product image
   * Max size: 5MB
   * Supported formats: jpg, png, webp
   */
  static async uploadProductImage(file: File): Promise<UploadResponse> {
    // Validate file size
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File size must be less than 5MB');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only JPG, PNG, and WebP images are allowed');
    }

    const formData = new FormData();
    formData.append('file', file);

    return this.fetchWithAuth(`${API_BASE_URL}/upload/product-image`, {
      method: 'POST',
      body: formData,
    });
  }
}
