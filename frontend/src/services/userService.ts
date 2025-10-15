import { apiClient } from "./apiClient";

export type RoleLevel = "ADMIN" | "F1" | "F2" | "F3" | "F4" | "F5" | "F6";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BANNED";

export interface CreateUserPayload {
  email: string;
  username: string;
  password: string;
  role: RoleLevel;
  sponsorId: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  phone?: string;
  avatar?: string;
  role: string;
  sponsorId?: string;
  referralCode: string;
  status: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserTreeNodeResponse {
  user: UserResponse;
  children: UserTreeNodeResponse[];
}

export const userService = {
  createUser(authToken: string, payload: CreateUserPayload) {
    return apiClient<UserResponse>("/users", {
      method: "POST",
      authToken,
      body: payload,
    });
  },

  listUsers(authToken: string, params: { role?: RoleLevel; limit?: number; page?: number }) {
    const searchParams = new URLSearchParams();
    if (params.role) {
      searchParams.set("role", params.role);
    }
    if (params.limit) {
      searchParams.set("limit", String(params.limit));
    }
    if (params.page) {
      searchParams.set("page", String(params.page));
    }

    const query = searchParams.toString();
    return apiClient<{ data: UserResponse[]; pagination?: unknown }>(`/users${query ? `?${query}` : ""}`, {
      method: "GET",
      authToken,
    });
  },

  getTree(
    authToken: string,
    params: { rootId?: string; role?: RoleLevel; status?: UserStatus; maxDepth?: number } = {},
  ) {
    const searchParams = new URLSearchParams();
    if (params.rootId) {
      searchParams.set("rootId", params.rootId);
    }
    if (params.role) {
      searchParams.set("role", params.role);
    }
    if (params.status) {
      searchParams.set("status", params.status);
    }
    if (typeof params.maxDepth === "number") {
      searchParams.set("maxDepth", String(params.maxDepth));
    }

    const query = searchParams.toString();
    return apiClient<{ data: UserTreeNodeResponse[] }>(`/users/tree${query ? `?${query}` : ""}`, {
      method: "GET",
      authToken,
    });
  },
};
