import { apiClient } from "./apiClient";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
  referralCode?: string;
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

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  referralCode: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface RegisterResponse {
  message: string;
  user: AuthUser;
}

export const authService = {
  register(data: RegisterData) {
    return apiClient<RegisterResponse>("/auth/register", {
      method: "POST",
      body: data,
    });
  },

  login(usernameOrEmail: string, password: string) {
    return apiClient<LoginResponse>("/auth/login", {
      method: "POST",
      body: { usernameOrEmail, password },
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
