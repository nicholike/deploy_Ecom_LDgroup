import { apiClient } from "./apiClient";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ForgotPasswordResponse {
  message: string;
  resetToken?: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export const authService = {
  login(email: string, password: string) {
    return apiClient<LoginResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
  },

  refresh(refreshToken: string) {
    return apiClient<RefreshResponse>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
    });
  },

  getProfile(authToken: string) {
    return apiClient<AuthUser>("/auth/me", {
      method: "GET",
      authToken,
    });
  },

  requestPasswordReset(email: string) {
    return apiClient<ForgotPasswordResponse>("/auth/forgot-password", {
      method: "POST",
      body: { email },
    });
  },

  resetPassword(token: string, password: string) {
    return apiClient<ResetPasswordResponse>("/auth/reset-password", {
      method: "POST",
      body: { token, password },
    });
  },

  changePassword(authToken: string, currentPassword: string, newPassword: string) {
    return apiClient<ChangePasswordResponse>("/auth/change-password", {
      method: "POST",
      authToken,
      body: { currentPassword, newPassword },
    });
  },
};
