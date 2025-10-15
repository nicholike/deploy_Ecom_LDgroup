const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export interface DashboardStats {
  totalMembers: number;
  totalMembersGrowth: number;
  networkDepth: number;
  totalDownlines: number;
  totalCommission: number;
  totalCommissionGrowth: number;
  monthlySales: number;
  monthlySalesGrowth: number;
  activeF1: number;
  newMembersThisMonth: number;
}

export interface MonthlyChartData {
  months: string[];
  revenue: number[];
  commission: number[];
}

export interface GrowthChartData {
  dates: string[];
  newMembers: number[];
  sales: number[];
  commissions: number[];
}

export interface TierDistribution {
  F1: number;
  F2: number;
  F3: number;
  F4: number;
  F5: number;
  F6: number;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  commission: number;
  status: string;
  createdAt: string;
  items: number;
}

export class DashboardService {
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

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.success ? data.data : data;
  }

  static async getStats(): Promise<DashboardStats> {
    return this.fetchWithAuth(`${API_BASE_URL}/admin/dashboard/stats`);
  }

  static async getMonthlyChart(year?: number): Promise<MonthlyChartData> {
    const yearParam = year || new Date().getFullYear();
    return this.fetchWithAuth(`${API_BASE_URL}/admin/dashboard/monthly-chart?year=${yearParam}`);
  }

  static async getGrowthChart(days: number = 30): Promise<GrowthChartData> {
    return this.fetchWithAuth(`${API_BASE_URL}/admin/dashboard/growth-chart?days=${days}`);
  }

  static async getTierDistribution(): Promise<TierDistribution> {
    return this.fetchWithAuth(`${API_BASE_URL}/admin/dashboard/tier-distribution`);
  }

  static async getRecentOrders(): Promise<RecentOrder[]> {
    return this.fetchWithAuth(`${API_BASE_URL}/admin/dashboard/recent-orders`);
  }
}


