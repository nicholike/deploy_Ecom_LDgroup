/**
 * User service - API calls
 */

import { apiClient } from '@/shared/lib/api-client';
import type { 
  User, 
  CreateUserDto, 
  UpdateUserDto, 
  UserFilters,
  UserTreeNode 
} from '../types/user.types';
import type { PaginatedResponse, PaginationParams } from '@/shared/types/common.types';

class UserService {
  /**
   * Get paginated list of users
   */
  async getUsers(
    params: Partial<UserFilters & PaginationParams> = {}
  ): Promise<PaginatedResponse<User>> {
    const { data } = await apiClient.get('/users', { params });
    return data;
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User> {
    const { data } = await apiClient.get(`/users/${id}`);
    return data.data;
  }

  /**
   * Create new user
   */
  async createUser(dto: CreateUserDto): Promise<User> {
    const { data } = await apiClient.post('/users', dto);
    return data.data;
  }

  /**
   * Update user
   */
  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const { data } = await apiClient.put(`/users/${id}`, dto);
    return data.data;
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  }

  /**
   * Get user's MLM tree
   */
  async getUserTree(id: string): Promise<UserTreeNode> {
    const { data } = await apiClient.get(`/users/${id}/tree`);
    return data.data;
  }

  /**
   * Get direct downline
   */
  async getDownline(id: string): Promise<User[]> {
    const { data } = await apiClient.get(`/users/${id}/downline`);
    return data.data;
  }

  /**
   * Get upline chain
   */
  async getUpline(id: string): Promise<User[]> {
    const { data } = await apiClient.get(`/users/${id}/upline`);
    return data.data;
  }
}

export const userService = new UserService();
