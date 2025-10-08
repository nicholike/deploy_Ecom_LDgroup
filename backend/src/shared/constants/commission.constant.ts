export const DEFAULT_COMMISSION_RATES = {
  LEVEL_1: 10, // F1: 10%
  LEVEL_2: 7, // F2: 7%
  LEVEL_3: 5, // F3: 5%
  LEVEL_4: 3, // F4: 3%
};

export const MAX_COMMISSION_LEVELS = 4;

export enum CommissionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

// Order statuses that are eligible for commission
export const COMMISSION_ELIGIBLE_STATUSES = ['COMPLETED', 'DELIVERED'];
