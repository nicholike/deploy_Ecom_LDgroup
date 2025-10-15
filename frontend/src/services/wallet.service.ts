import { apiClient } from './apiClient';
import type {
  Wallet,
  WalletTransaction,
  WithdrawalRequest,
  WithdrawalListParams,
  WithdrawalListResponse,
  TransactionListParams,
  TransactionListResponse,
  BankInfo,
  WalletStats,
} from '../types/wallet.types';

const API_PREFIX = '';

export const walletService = {
  /**
   * Get user's wallet
   */
  async getWallet(token: string): Promise<Wallet> {
    return apiClient<Wallet>(`${API_PREFIX}/wallet`, {
      method: 'GET',
      authToken: token,
    });
  },

  /**
   * Get wallet balance
   */
  async getBalance(token: string): Promise<{ balance: number }> {
    return apiClient<{ balance: number }>(`${API_PREFIX}/wallet/balance`, {
      method: 'GET',
      authToken: token,
    });
  },

  /**
   * Get transaction history
   */
  async getTransactions(
    params: TransactionListParams,
    token: string,
  ): Promise<TransactionListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.type) query.append('type', params.type);

    return apiClient<TransactionListResponse>(
      `${API_PREFIX}/wallet/transactions?${query.toString()}`,
      {
        method: 'GET',
        authToken: token,
      },
    );
  },

  /**
   * Request withdrawal
   */
  async requestWithdrawal(
    amount: number,
    bankInfo: BankInfo,
    userNote: string | undefined,
    token: string,
  ): Promise<WithdrawalRequest> {
    return apiClient<WithdrawalRequest>(`${API_PREFIX}/wallet/withdrawal/request`, {
      method: 'POST',
      body: { amount, bankInfo, userNote },
      authToken: token,
    });
  },

  /**
   * Get withdrawal history
   */
  async getWithdrawalHistory(
    params: WithdrawalListParams,
    token: string,
  ): Promise<WithdrawalListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());

    return apiClient<WithdrawalListResponse>(
      `${API_PREFIX}/wallet/withdrawal/history?${query.toString()}`,
      {
        method: 'GET',
        authToken: token,
      },
    );
  },

  // ========== ADMIN ENDPOINTS ==========

  /**
   * Admin: Get all withdrawal requests
   */
  async getAllWithdrawals(
    params: WithdrawalListParams,
    token: string,
  ): Promise<WithdrawalListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.status) query.append('status', params.status);
    if (params.userId) query.append('userId', params.userId);

    return apiClient<WithdrawalListResponse>(
      `${API_PREFIX}/admin/withdrawals?${query.toString()}`,
      {
        method: 'GET',
        authToken: token,
      },
    );
  },

  /**
   * Admin: Approve withdrawal
   */
  async approveWithdrawal(
    withdrawalId: string,
    adminNote: string | undefined,
    token: string,
  ): Promise<WithdrawalRequest> {
    return apiClient<WithdrawalRequest>(
      `${API_PREFIX}/admin/withdrawals/${withdrawalId}/approve`,
      {
        method: 'POST',
        body: { adminNote },
        authToken: token,
      },
    );
  },

  /**
   * Admin: Complete withdrawal
   */
  async completeWithdrawal(
    withdrawalId: string,
    adminNote: string | undefined,
    token: string,
  ): Promise<WithdrawalRequest> {
    return apiClient<WithdrawalRequest>(
      `${API_PREFIX}/admin/withdrawals/${withdrawalId}/complete`,
      {
        method: 'POST',
        body: { adminNote },
        authToken: token,
      },
    );
  },

  /**
   * Admin: Reject withdrawal
   */
  async rejectWithdrawal(
    withdrawalId: string,
    rejectReason: string,
    adminNote: string | undefined,
    token: string,
  ): Promise<WithdrawalRequest> {
    return apiClient<WithdrawalRequest>(
      `${API_PREFIX}/admin/withdrawals/${withdrawalId}/reject`,
      {
        method: 'POST',
        body: { rejectReason, adminNote },
        authToken: token,
      },
    );
  },

  /**
   * Admin: Get negative balance wallets
   */
  async getNegativeBalanceWallets(token: string): Promise<Wallet[]> {
    return apiClient<Wallet[]>(`${API_PREFIX}/wallet/admin/negative-balances`, {
      method: 'GET',
      authToken: token,
    });
  },

  /**
   * Admin: Get wallet statistics
   */
  async getWalletStats(token: string): Promise<WalletStats> {
    return apiClient<WalletStats>(`${API_PREFIX}/wallet/admin/stats`, {
      method: 'GET',
      authToken: token,
    });
  },

  /**
   * Admin: Get top users by wallet balance
   */
  async getTopBalanceUsers(limit: number, token: string): Promise<any[]> {
    return apiClient<any[]>(`${API_PREFIX}/wallet/admin/top-users?limit=${limit}`, {
      method: 'GET',
      authToken: token,
    });
  },

  /**
   * Admin: Adjust wallet balance manually
   */
  async adjustBalance(
    userId: string,
    amount: number,
    description: string,
    token: string,
  ): Promise<WalletTransaction> {
    return apiClient<WalletTransaction>(`${API_PREFIX}/wallet/admin/adjust-balance`, {
      method: 'POST',
      body: { userId, amount, description },
      authToken: token,
    });
  },

  /**
   * Admin: Get transaction history for a specific user
   */
  async getUserTransactions(
    userId: string,
    params: { page?: number; limit?: number; type?: string },
    token: string,
  ): Promise<{ data: WalletTransaction[]; total: number; page: number; limit: number }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.type) queryParams.set('type', params.type);

    return apiClient<{ data: WalletTransaction[]; total: number; page: number; limit: number }>(
      `${API_PREFIX}/wallet/admin/user-transactions/${userId}?${queryParams.toString()}`,
      {
        method: 'GET',
        authToken: token,
      },
    );
  },
};
