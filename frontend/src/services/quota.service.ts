import { apiClient } from "./apiClient";

export interface QuotaSizeInfo {
  limit: number;
  used: number;
  remaining: number;
  inCart?: number;
  remainingAfterCart?: number;
}

export interface QuotaResponse {
  // NEW: Size-specific quota
  quota5ml: QuotaSizeInfo;
  quota20ml: QuotaSizeInfo;
  quotaSpecial: QuotaSizeInfo;
  
  // Period info
  quotaPeriodStart: string | null;
  quotaPeriodEnd: string | null;
  isPeriodExpired?: boolean;
  message?: string;
  
  // DEPRECATED: Old total quota (for backwards compatibility)
  quotaLimit: number;
  quotaUsed: number;
  quotaRemaining: number;
  cartQuantity?: number;
  remainingAfterCart?: number;
}

export const quotaService = {
  async getMyQuota(authToken?: string | null): Promise<QuotaResponse> {
    return apiClient<QuotaResponse>("/users/quota/me", {
      method: "GET",
      authToken: authToken ?? null,
    });
  },
};
