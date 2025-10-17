import { User } from '../entities/user.entity';
import { UserRole, UserStatus } from '@shared/constants/user-roles.constant';
import { PaginatedResult, PaginationParams } from '@shared/common/pagination.interface';

export interface UserTreeNode {
  user: User;
  children: UserTreeNode[];
}

export interface GetUserTreeOptions {
  rootId?: string;
  role?: UserRole;
  status?: UserStatus;
  maxDepth?: number;
}

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
   * Update user with partial data
   */
  update(id: string, data: Partial<{
    username?: string;
    passwordHash?: string;
    role?: UserRole;
    sponsorId?: string | null;
    status?: UserStatus;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    avatar?: string | null;
    emailVerified?: boolean;
    quotaLimit?: number;
    quotaUsed?: number;
    quotaPeriodStart?: Date | null;
    lockedAt?: Date | null;
    lockedReason?: string | null;
    approvedAt?: Date | null;
    approvedBy?: string | null;
    rejectedAt?: Date | null;
    rejectedBy?: string | null;
    rejectionReason?: string | null;
  }>): Promise<User>;

  /**
   * Create UserTree entries for a newly approved user
   */
  createUserTreeEntries(userId: string): Promise<void>;

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
   * Check if phone number exists
   */
  phoneExists(phone: string): Promise<boolean>;

  /**
   * Check if referral code exists
   */
  referralCodeExists(code: string): Promise<boolean>;

  /**
   * Find root admin (first admin created, no sponsor)
   */
  findRootAdmin(): Promise<User | null>;

  /**
   * Build an MLM tree using the closure table data
   */
  getTree(options?: GetUserTreeOptions): Promise<UserTreeNode[]>;

  /**
   * 🔧 ATOMIC: Increment quota (prevents race condition)
   */
  incrementQuota(userId: string, amount: number): Promise<void>;

  /**
   * 🔧 ATOMIC: Decrement quota (prevents race condition)
   */
  decrementQuota(userId: string, amount: number): Promise<void>;
}
