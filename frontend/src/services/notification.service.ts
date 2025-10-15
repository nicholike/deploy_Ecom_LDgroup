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

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  actionText?: string | null;
  metadata?: any;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
}

export const NotificationService = {
  // ========================================
  // GET NOTIFICATIONS
  // ========================================
  async getNotifications(params?: {
    read?: boolean;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<NotificationResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.read !== undefined) queryParams.append('read', params.read.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const url = `/notifications?${queryParams.toString()}`;
    const response = await apiClient<NotificationResponse>(
      url,
      { method: 'GET', authToken: getAuthToken() }
    );
    return response;
  },

  // ========================================
  // GET UNREAD COUNT
  // ========================================
  async getUnreadCount(): Promise<number> {
    const response = await apiClient<{ count: number }>(
      '/notifications/unread-count',
      { method: 'GET', authToken: getAuthToken() }
    );
    return response.count;
  },

  // ========================================
  // MARK AS READ
  // ========================================
  async markAsRead(notificationId: string): Promise<Notification> {
    const response = await apiClient<Notification>(
      `/notifications/${notificationId}/read`,
      { method: 'PUT', authToken: getAuthToken() }
    );
    return response;
  },

  // ========================================
  // MARK ALL AS READ
  // ========================================
  async markAllAsRead(): Promise<number> {
    const response = await apiClient<{ count: number }>(
      '/notifications/read-all',
      { method: 'PUT', authToken: getAuthToken() }
    );
    return response.count;
  },

  // ========================================
  // DELETE NOTIFICATION
  // ========================================
  async deleteNotification(notificationId: string): Promise<void> {
    await apiClient<void>(
      `/notifications/${notificationId}`,
      { method: 'DELETE', authToken: getAuthToken() }
    );
  },
};


