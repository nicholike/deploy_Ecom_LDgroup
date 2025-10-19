import { apiClient } from './apiClient';

// Helper to get auth token
const getAuthToken = (): string | null => {
  try {
    const auth = localStorage.getItem('ldgroup_admin_auth');
    if (auth) {
      const parsed = JSON.parse(auth);
      return parsed.accessToken || null;
    }
  } catch (error) {
    console.error('Failed to get auth token:', error);
  }
  return null;
};

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  byRole: Record<string, number>;
  byFlevel: Record<string, number>;
}

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  status: string;
  sponsorId: string | null;
  sponsor?: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  } | null;
  emailVerified: boolean;
  lockedAt: string | null;
  lockedReason: string | null;
  createdAt: string;
}

export interface UserDetail extends User {
  downlineCount: number;
  quota: {
    quotaLimit: number;
    quotaUsed: number;
    quotaRemaining: number;
    periodStart: string;
    periodEnd: string;
  } | null;
}

export interface PaginatedUsers {
  users: User[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface SearchUsersParams {
  page?: number;
  pageSize?: number;
  role?: string;
  status?: string;
  sponsorId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const UserManagementService = {
  // ========================================
  // STATS
  // ========================================
  async getStats(): Promise<UserStats> {
    const response = await apiClient<UserStats>(
      '/admin/users/stats',
      { method: 'GET', authToken: getAuthToken() }
    );
    return response;
  },

  // ========================================
  // SEARCH & LIST
  // ========================================
  async searchUsers(params: SearchUsersParams): Promise<PaginatedUsers> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.role) queryParams.append('role', params.role);
    if (params.status) queryParams.append('status', params.status);
    if (params.sponsorId) queryParams.append('sponsorId', params.sponsorId);
    if (params.search) queryParams.append('search', params.search);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = `/admin/users/search?${queryParams.toString()}`;
    const response = await apiClient<PaginatedUsers>(
      url,
      { method: 'GET', authToken: getAuthToken() }
    );
    return response;
  },

  // ========================================
  // USER DETAILS
  // ========================================
  async getUserDetails(userId: string): Promise<UserDetail> {
    const response = await apiClient<UserDetail>(
      `/admin/users/${userId}/details`,
      { method: 'GET', authToken: getAuthToken() }
    );
    return response;
  },

  // ========================================
  // LOCK / UNLOCK
  // ========================================
  async lockUser(userId: string, reason: string): Promise<User> {
    const response = await apiClient<User>(
      `/admin/users/${userId}/lock`,
      {
        method: 'PUT',
        body: { reason },
        authToken: getAuthToken(),
      }
    );
    return response;
  },

  async unlockUser(userId: string): Promise<User> {
    const response = await apiClient<User>(
      `/admin/users/${userId}/unlock`,
      { method: 'PUT', authToken: getAuthToken() }
    );
    return response;
  },

  // ========================================
  // BULK ACTIONS
  // ========================================
  async bulkLockUsers(userIds: string[], reason: string): Promise<{
    success: number;
    failed: number;
    errors: any[];
  }> {
    const response = await apiClient<{ success: number; failed: number; errors: any[] }>(
      '/admin/users/bulk-lock',
      {
        method: 'POST',
        body: { userIds, reason },
        authToken: getAuthToken(),
      }
    );
    return response;
  },

  async bulkUnlockUsers(userIds: string[]): Promise<{
    success: number;
    failed: number;
    errors: any[];
  }> {
    const response = await apiClient<{ success: number; failed: number; errors: any[] }>(
      '/admin/users/bulk-unlock',
      {
        method: 'POST',
        body: { userIds },
        authToken: getAuthToken(),
      }
    );
    return response;
  },

  // ========================================
  // UPDATE USER INFO
  // ========================================
  async updateUser(userId: string, data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatar?: string;
  }): Promise<User> {
    const response = await apiClient<User>(
      `/admin/users/${userId}`,
      {
        method: 'PUT',
        body: data,
        authToken: getAuthToken(),
      }
    );
    return response;
  },

  // ========================================
  // TRANSFER BRANCH (CHANGE SPONSOR)
  // ========================================
  async changeSponsor(userId: string, newSponsorId: string): Promise<{
    success: boolean;
    message: string;
    userId: string;
    newSponsorId: string;
  }> {
    const response = await apiClient<{
      success: boolean;
      message: string;
      userId: string;
      newSponsorId: string;
    }>(
      `/admin/users/${userId}/change-sponsor`,
      {
        method: 'PUT',
        body: { newSponsorId },
        authToken: getAuthToken(),
      }
    );
    return response;
  },

  async getWalletBalance(userId: string): Promise<{ balance: number }> {
    const response = await apiClient<{ balance: number }>(
      `/users/${userId}/wallet/balance`,
      { method: 'GET', authToken: getAuthToken() }
    );
    return response;
  },

  // ========================================
  // PENDING USERS - APPROVAL WORKFLOW
  // ========================================
  async getPendingUsers(params: { page?: number; limit?: number; search?: string }): Promise<{
    data: Array<{
      id: string;
      email: string;
      username: string;
      firstName: string | null;
      lastName: string | null;
      role: string;
      referralCode: string;
      sponsor: {
        id: string;
        username: string;
        role: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
        phone: string | null;
        referralCode: string;
        status: string;
      } | null;
      createdAt: string;
    }>;
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);

    const url = `/users/pending?${queryParams.toString()}`;
    const response = await apiClient<{
      data: Array<{
        id: string;
        email: string;
        username: string;
        firstName: string | null;
        lastName: string | null;
        role: string;
        referralCode: string;
        sponsor: {
          id: string;
          username: string;
          role: string;
          firstName: string | null;
          lastName: string | null;
          email: string;
          phone: string | null;
          referralCode: string;
          status: string;
        } | null;
        createdAt: string;
      }>;
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>(url, { method: 'GET', authToken: getAuthToken() });
    return response;
  },

  async approveUser(userId: string): Promise<{ message: string }> {
    const response = await apiClient<{ message: string }>(
      `/users/${userId}/approve`,
      {
        method: 'POST',
        authToken: getAuthToken(),
      }
    );
    return response;
  },

  async rejectUser(userId: string, reason: string): Promise<{ message: string }> {
    const response = await apiClient<{ message: string }>(
      `/users/${userId}/reject`,
      {
        method: 'POST',
        body: { reason },
        authToken: getAuthToken(),
      }
    );
    return response;
  },
};


