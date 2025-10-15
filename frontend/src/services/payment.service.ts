import { apiClient } from './apiClient';

export interface PaymentInfo {
  orderId: string;
  orderNumber: string;
  amount: number;
  paymentStatus: string;
  bankAccount: {
    accountNumber: string;
    accountName: string;
    bankCode: string;
    bankName: string;
  };
  description: string;
  qrCodeUrl: string;
}

export interface PaymentStatusResponse {
  orderId: string;
  orderNumber: string;
  paymentStatus: string;
  paidAt?: string;
  transactions: Array<{
    id: string;
    gateway: string;
    amount: number;
    transactionDate: string;
    referenceNumber?: string;
  }>;
}

export interface BankTransaction {
  id: string;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  amountIn: number;
  amountOut: number;
  transactionContent: string;
  processed: boolean;
  orderId?: string;
  order?: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    status: string;
    paymentStatus: string;
  };
}

export const paymentService = {
  /**
   * Get payment information for an order (QR code, bank details)
   */
  async getPaymentInfo(orderId: string, token: string): Promise<PaymentInfo> {
    return apiClient<PaymentInfo>(`/payment/info/${orderId}`, {
      method: 'GET',
      authToken: token,
    });
  },

  /**
   * Check payment status of an order
   */
  async checkPaymentStatus(orderId: string, token: string): Promise<PaymentStatusResponse> {
    return apiClient<PaymentStatusResponse>(`/payment/status/${orderId}`, {
      method: 'GET',
      authToken: token,
    });
  },

  /**
   * Admin: Get all bank transactions
   */
  async getAllTransactions(
    params: { page?: number; limit?: number },
    token: string,
  ): Promise<{ data: BankTransaction[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());

    return apiClient<{ data: BankTransaction[]; pagination: any }>(
      `/payment/admin/transactions?${queryParams.toString()}`,
      {
        method: 'GET',
        authToken: token,
      },
    );
  },
};

