import { apiClient } from "./apiClient";

export interface QuotaResponse {
  quotaLimit: number;
  quotaUsed: number;
  quotaRemaining: number;
  quotaPeriodStart: string | null;
  quotaPeriodEnd: string | null;
  isPeriodExpired: boolean;
  message?: string;
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
