export enum CommissionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export interface Commission {
  id: string;
  userId: string;
  orderId: string;
  fromUserId: string;
  level: number;
  orderValue: number;
  commissionRate: number;
  commissionAmount: number;
  period: string;
  status: CommissionStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  order?: {
    id: string;
    orderNumber: string;
    totalAmount: number;
  };
  fromUser?: {
    id: string;
    username: string;
    email: string;
  };
}

export interface CommissionSummary {
  totalEarned: number;
  totalPending: number;
  totalApproved: number;
  availableBalance: number;
}

export interface CommissionStats {
  period: string;
  totalCommission: number;
  commissionCount: number;
  avgCommission: number;
}

export interface CommissionListParams {
  page?: number;
  limit?: number;
  period?: string;
  status?: CommissionStatus;
  userId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface CommissionListResponse {
  data: Commission[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
