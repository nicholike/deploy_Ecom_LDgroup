export enum WalletTransactionType {
  COMMISSION_EARNED = 'COMMISSION_EARNED',
  COMMISSION_REFUND = 'COMMISSION_REFUND',
  WITHDRAWAL = 'WITHDRAWAL',
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
  ORDER_REFUND = 'ORDER_REFUND',
}

export enum WithdrawalStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  orderId?: string;
  commissionId?: string;
  withdrawalId?: string;
  description?: string;
  createdAt: string;
}

export interface BankInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
  branch?: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  bankInfo: BankInfo;
  status: WithdrawalStatus;
  userNote?: string;
  adminNote?: string;
  rejectReason?: string;
  processedBy?: string;
  processedAt?: string;
  completedAt?: string;
  requestedAt: string; // Date when withdrawal was requested
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

export interface WithdrawalListParams {
  page?: number;
  limit?: number;
  status?: WithdrawalStatus;
  userId?: string;
}

export interface WithdrawalListResponse {
  data: WithdrawalRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TransactionListParams {
  page?: number;
  limit?: number;
  type?: WalletTransactionType;
}

export interface TransactionListResponse {
  data: WalletTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface WalletStats {
  totalWallets: number;
  totalBalance: number;
  negativeBalanceCount: number;
  negativeBalanceTotal: number;
}
