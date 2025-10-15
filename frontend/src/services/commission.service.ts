import { apiClient } from './apiClient';
import type {
  Commission,
  CommissionSummary,
  CommissionStats,
  CommissionListParams,
  CommissionListResponse,
} from '../types/commission.types';

const API_PREFIX = '';

export const commissionService = {
  /**
   * Get user's commission summary
   */
  async getSummary(token: string): Promise<CommissionSummary> {
    return apiClient<CommissionSummary>(`${API_PREFIX}/commissions/summary`, {
      method: 'GET',
      authToken: token,
    });
  },

  /**
   * Get user's commission list with pagination
   */
  async getCommissions(
    params: CommissionListParams,
    token: string,
  ): Promise<CommissionListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.period) query.append('period', params.period);
    if (params.status) query.append('status', params.status);

    return apiClient<CommissionListResponse>(
      `${API_PREFIX}/commissions?${query.toString()}`,
      {
        method: 'GET',
        authToken: token,
      },
    );
  },

  /**
   * Get commission statistics
   */
  async getStats(
    fromDate?: string,
    toDate?: string,
    token?: string,
  ): Promise<CommissionStats[]> {
    const query = new URLSearchParams();
    if (fromDate) query.append('fromDate', fromDate);
    if (toDate) query.append('toDate', toDate);

    return apiClient<CommissionStats[]>(
      `${API_PREFIX}/commissions/stats?${query.toString()}`,
      {
        method: 'GET',
        authToken: token,
      },
    );
  },

  /**
   * Get commission detail by ID
   */
  async getCommissionById(id: string, token: string): Promise<Commission> {
    return apiClient<Commission>(`${API_PREFIX}/commissions/${id}`, {
      method: 'GET',
      authToken: token,
    });
  },

  // ========== ADMIN ENDPOINTS ==========

  /**
   * Admin: Get all commissions with filters
   */
  async getAllCommissions(
    params: CommissionListParams,
    token: string,
  ): Promise<CommissionListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.userId) query.append('userId', params.userId);
    if (params.period) query.append('period', params.period);
    if (params.status) query.append('status', params.status);
    if (params.fromDate) query.append('fromDate', params.fromDate);
    if (params.toDate) query.append('toDate', params.toDate);

    return apiClient<CommissionListResponse>(
      `${API_PREFIX}/admin/commissions?${query.toString()}`,
      {
        method: 'GET',
        authToken: token,
      },
    );
  },

  /**
   * Admin: Get all commission statistics
   */
  async getAllStats(
    userId?: string,
    fromDate?: string,
    toDate?: string,
    token?: string,
  ): Promise<CommissionStats[]> {
    const query = new URLSearchParams();
    if (userId) query.append('userId', userId);
    if (fromDate) query.append('fromDate', fromDate);
    if (toDate) query.append('toDate', toDate);

    return apiClient<CommissionStats[]>(
      `${API_PREFIX}/admin/commissions/stats/all?${query.toString()}`,
      {
        method: 'GET',
        authToken: token,
      },
    );
  },

  /**
   * Admin: Get user's commission summary
   */
  async getUserSummary(userId: string, token: string): Promise<CommissionSummary> {
    return apiClient<CommissionSummary>(
      `${API_PREFIX}/admin/commissions/user/${userId}/summary`,
      {
        method: 'GET',
        authToken: token,
      },
    );
  },
};
