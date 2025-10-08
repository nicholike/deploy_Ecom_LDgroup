import { User } from '../entities/user.entity';
import { UserRole, UserStatus } from '@shared/constants/user-roles.constant';
import { PaginatedResult, PaginationParams } from '@shared/common/pagination.interface';

export interface FindUserOptions extends PaginationParams {
  role?: UserRole;
  status?: UserStatus;
  sponsorId?: string;
  search?: string; // Search by email, username, name
}

export interface IUserRepository {
  /**
   * Find user by ID
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find user by username
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * Find user by referral code
   */
  findByReferralCode(code: string): Promise<User | null>;

  /**
   * Find multiple users with pagination
   */
  findMany(options: FindUserOptions): Promise<PaginatedResult<User>>;

  /**
   * Get user's direct downline
   */
  findDownline(userId: string, options?: PaginationParams): Promise<PaginatedResult<User>>;

  /**
   * Get user's upline chain (sponsor → sponsor's sponsor → ...)
   */
  findUplineChain(userId: string, maxLevel?: number): Promise<User[]>;

  /**
   * Save user (create or update)
   */
  save(user: User): Promise<User>;

  /**
   * Delete user (soft delete)
   */
  delete(id: string): Promise<void>;

  /**
   * Check if email exists
   */
  emailExists(email: string): Promise<boolean>;

  /**
   * Check if username exists
   */
  usernameExists(username: string): Promise<boolean>;

  /**
   * Check if referral code exists
   */
  referralCodeExists(code: string): Promise<boolean>;
}
