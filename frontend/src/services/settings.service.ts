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

export interface CommissionConfig {
  id: string;
  level: number;
  commissionRate: number;
  commissionType: string;
  minOrderValue: number | null;
  maxCommission: number | null;
  active: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  type: string;
  category: string;
  label: string;
  description: string | null;
  required: boolean;
  editable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SettingsResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const SettingsService = {
  // ========================================
  // COMMISSION
  // ========================================
  async getCommissionConfigs(): Promise<CommissionConfig[]> {
    const response = await apiClient<CommissionConfig[]>(
      '/admin/settings/commission',
      { method: 'GET', authToken: getAuthToken() }
    );
    return response;
  },

  async updateCommissionConfig(
    level: number,
    data: {
      commissionRate: number;
      minOrderValue?: number;
      maxCommission?: number;
    }
  ): Promise<CommissionConfig> {
    const response = await apiClient<CommissionConfig>(
      `/admin/settings/commission/${level}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
        authToken: getAuthToken(),
      }
    );
    return response;
  },

  // ========================================
  // SYSTEM SETTINGS
  // ========================================
  async getSystemSettings(category?: string): Promise<{
    settings: SystemSetting[];
    grouped: Record<string, SystemSetting[]>;
  }> {
    const url = category
      ? `/admin/settings/system?category=${category}`
      : '/admin/settings/system';
    const response = await apiClient<{
      settings: SystemSetting[];
      grouped: Record<string, SystemSetting[]>;
    }>(url, { method: 'GET', authToken: getAuthToken() });
    return response;
  },

  async getSystemSetting(key: string): Promise<SystemSetting> {
    const response = await apiClient<SystemSetting>(
      `/admin/settings/system/${key}`,
      { method: 'GET', authToken: getAuthToken() }
    );
    return response;
  },

  async createSystemSetting(data: {
    key: string;
    value: string;
    type?: string;
    category?: string;
    label: string;
    description?: string;
    required?: boolean;
    editable?: boolean;
  }): Promise<SystemSetting> {
    const response = await apiClient<SystemSetting>(
      '/admin/settings/system',
      {
        method: 'POST',
        body: JSON.stringify(data),
        authToken: getAuthToken(),
      }
    );
    return response;
  },

  async updateSystemSetting(
    key: string,
    data: {
      value: string;
      label?: string;
      description?: string;
    }
  ): Promise<SystemSetting> {
    const response = await apiClient<SystemSetting>(
      `/admin/settings/system/${key}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
        authToken: getAuthToken(),
      }
    );
    return response;
  },

  // ========================================
  // INIT DEFAULT
  // ========================================
  async initDefaultSettings(): Promise<{
    created: number;
    skipped: number;
    errors: string[];
  }> {
    const response = await apiClient<{
      created: number;
      skipped: number;
      errors: string[];
    }>('/admin/settings/init-default', {
      method: 'POST',
      authToken: getAuthToken(),
    });
    return response;
  },

  // ========================================
  // PRICING
  // ========================================
  async getGlobalPricing(): Promise<{
    '5ml': {
      range1to9: number;
      range10to99: number;
      range100plus: number;
    };
    '20ml': {
      range1to9: number;
      range10to99: number;
      range100plus: number;
    };
  }> {
    const response = await apiClient<{
      '5ml': {
        range1to9: number;
        range10to99: number;
        range100plus: number;
      };
      '20ml': {
        range1to9: number;
        range10to99: number;
        range100plus: number;
      };
    }>('/admin/settings/pricing/global', {
      method: 'GET',
      authToken: getAuthToken(),
    });
    return response;
  },

  async updateGlobalPricing(data: {
    '5ml': {
      range1to9: number;
      range10to99: number;
      range100plus: number;
    };
    '20ml': {
      range1to9: number;
      range10to99: number;
      range100plus: number;
    };
  }): Promise<void> {
    await apiClient<void>('/admin/settings/pricing/global', {
      method: 'PUT',
      body: data, // Let apiClient handle JSON.stringify and Content-Type header
      authToken: getAuthToken(),
    });
  },
};


