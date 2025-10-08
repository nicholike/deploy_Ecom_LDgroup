/**
 * Authentication service
 */

import { apiClient } from '@/shared/lib/api-client';
import type { LoginDto, LoginResponse, ChangePasswordDto } from '../types/auth.types';
import type { User } from '@/features/user/types/user.types';

class AuthService {
  /**
   * Login
   */
  async login(dto: LoginDto): Promise<LoginResponse> {
    const { data } = await apiClient.post('/auth/login', dto);
    
    // Save token and user to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', data.data.access_token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
    }
    
    return data.data;
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User> {
    const { data } = await apiClient.get('/auth/me');
    
    // Update user in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(data.data));
    }
    
    return data.data;
  }

  /**
   * Change password
   */
  async changePassword(dto: ChangePasswordDto): Promise<void> {
    await apiClient.post('/auth/change-password', dto);
  }

  /**
   * Refresh token
   */
  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    const { data } = await apiClient.post('/auth/refresh', { refreshToken });
    
    // Update token in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', data.data.access_token);
    }
    
    return data.data;
  }

  /**
   * Get user from localStorage
   */
  getStoredUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  /**
   * Get token from localStorage
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export const authService = new AuthService();
