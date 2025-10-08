/**
 * User feature types
 */

import { UserRole, UserStatus } from '@/shared/types/common.types';

export interface User {
  id: string;
  email: string;
  username: string;
  
  // Profile
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  
  // MLM
  role: UserRole;
  sponsorId?: string;
  sponsor?: User;
  referralCode: string;
  
  // Status
  status: UserStatus;
  emailVerified: boolean;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface CreateUserDto {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: UserRole;
  sponsorId?: string;
}

export interface UpdateUserDto {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  status?: UserStatus;
}

export interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  sponsorId?: string;
}

export interface UserTreeNode {
  user: User;
  children: UserTreeNode[];
  level: number;
}
