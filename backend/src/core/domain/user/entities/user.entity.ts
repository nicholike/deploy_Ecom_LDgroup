import * as crypto from 'crypto';
import { BaseEntity } from '@shared/common/base.entity';
import {
  UserRole,
  UserStatus,
  ROLE_CREATION_PERMISSIONS,
} from '@shared/constants/user-roles.constant';
import { Email } from '../value-objects/email.vo';
import { ReferralCode } from '../value-objects/referral-code.vo';

export interface UserProps {
  email: Email;
  username: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  sponsorId?: string;
  referralCode: ReferralCode;
  status: UserStatus;
  emailVerified: boolean;
  lastLoginAt?: Date;
  quotaPeriodStart?: Date;
  quotaLimit: number;
  quotaUsed: number;
  lockedAt?: Date | null;
  lockedReason?: string | null;
  // Approval workflow
  approvedAt?: Date | null;
  approvedBy?: string | null;
  rejectedAt?: Date | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
}

export class User extends BaseEntity {
  private props: UserProps;

  private constructor(id: string, props: UserProps, createdAt?: Date, updatedAt?: Date) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  // Factory method to create new user
  static create(props: UserProps, id?: string): User {
    return new User(id || crypto.randomUUID(), props);
  }

  // Factory method to reconstitute from database
  static fromPersistence(id: string, props: UserProps, createdAt: Date, updatedAt: Date): User {
    return new User(id, props, createdAt, updatedAt);
  }

  // Getters
  get email(): Email {
    return this.props.email;
  }

  get username(): string {
    return this.props.username;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get firstName(): string | undefined {
    return this.props.firstName;
  }

  get lastName(): string | undefined {
    return this.props.lastName;
  }

  get fullName(): string {
    if (this.props.firstName && this.props.lastName) {
      return `${this.props.firstName} ${this.props.lastName}`;
    }
    return this.props.username;
  }

  get phone(): string | undefined {
    return this.props.phone;
  }

  get avatar(): string | undefined {
    return this.props.avatar;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get sponsorId(): string | undefined {
    return this.props.sponsorId;
  }

  get referralCode(): ReferralCode {
    return this.props.referralCode;
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get emailVerified(): boolean {
    return this.props.emailVerified;
  }

  get lastLoginAt(): Date | undefined {
    return this.props.lastLoginAt;
  }

  get quotaPeriodStart(): Date | undefined {
    return this.props.quotaPeriodStart;
  }

  get quotaLimit(): number {
    return this.props.quotaLimit;
  }

  get quotaUsed(): number {
    return this.props.quotaUsed;
  }

  get lockedAt(): Date | null | undefined {
    return this.props.lockedAt;
  }

  get lockedReason(): string | null | undefined {
    return this.props.lockedReason;
  }

  get approvedAt(): Date | null | undefined {
    return this.props.approvedAt;
  }

  get approvedBy(): string | null | undefined {
    return this.props.approvedBy;
  }

  get rejectedAt(): Date | null | undefined {
    return this.props.rejectedAt;
  }

  get rejectedBy(): string | null | undefined {
    return this.props.rejectedBy;
  }

  get rejectionReason(): string | null | undefined {
    return this.props.rejectionReason;
  }

  // Business methods
  updateProfile(data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatar?: string;
  }): void {
    if (data.firstName !== undefined) this.props.firstName = data.firstName;
    if (data.lastName !== undefined) this.props.lastName = data.lastName;
    if (data.phone !== undefined) this.props.phone = data.phone;
    if (data.avatar !== undefined) this.props.avatar = data.avatar;
    this.updatedAt = new Date();
  }

  changePassword(newPasswordHash: string): void {
    this.props.passwordHash = newPasswordHash;
    this.updatedAt = new Date();
  }

  verifyEmail(): void {
    this.props.emailVerified = true;
    this.updatedAt = new Date();
  }

  updateLastLogin(): void {
    this.props.lastLoginAt = new Date();
    this.updatedAt = new Date();
  }

  activate(): void {
    if (this.props.status === UserStatus.INACTIVE || this.props.status === UserStatus.PENDING) {
      this.props.status = UserStatus.ACTIVE;
      this.updatedAt = new Date();
    }
  }

  suspend(): void {
    if (this.props.status === UserStatus.ACTIVE) {
      this.props.status = UserStatus.SUSPENDED;
      this.updatedAt = new Date();
    }
  }

  ban(): void {
    this.props.status = UserStatus.BANNED;
    this.updatedAt = new Date();
  }

  // Approval workflow methods
  approve(adminId: string): void {
    if (this.props.status !== UserStatus.PENDING) {
      throw new Error('Can only approve users with PENDING status');
    }
    this.props.status = UserStatus.ACTIVE;
    this.props.approvedAt = new Date();
    this.props.approvedBy = adminId;
    this.updatedAt = new Date();
  }

  reject(adminId: string, reason: string): void {
    if (this.props.status !== UserStatus.PENDING) {
      throw new Error('Can only reject users with PENDING status');
    }
    this.props.status = UserStatus.REJECTED;
    this.props.rejectedAt = new Date();
    this.props.rejectedBy = adminId;
    this.props.rejectionReason = reason;
    this.updatedAt = new Date();
  }

  canCreateRole(targetRole: UserRole): boolean {
    // Use centralized role creation permissions
    // Only ADMIN can create all user types (F1, F2, F3, F4, ...)
    return ROLE_CREATION_PERMISSIONS[this.props.role]?.includes(targetRole) || false;
  }

  isActive(): boolean {
    return this.props.status === UserStatus.ACTIVE;
  }

  isPending(): boolean {
    return this.props.status === UserStatus.PENDING;
  }

  isRejected(): boolean {
    return this.props.status === UserStatus.REJECTED;
  }

  isAdmin(): boolean {
    return this.props.role === UserRole.ADMIN;
  }

  // Static method to calculate downline role based on sponsor role
  // F1 -> F2, F2 -> F3, ..., F6 -> F6 (stays at F6)
  static calculateDownlineRole(sponsorRole: UserRole): UserRole {
    const roleMap: Record<UserRole, UserRole> = {
      [UserRole.ADMIN]: UserRole.F1,  // Admin creates F1
      [UserRole.F1]: UserRole.F2,
      [UserRole.F2]: UserRole.F3,
      [UserRole.F3]: UserRole.F4,
      [UserRole.F4]: UserRole.F5,
      [UserRole.F5]: UserRole.F6,
      [UserRole.F6]: UserRole.F6,     // F6 stays at F6 (lowest level)
    };
    return roleMap[sponsorRole];
  }

  // Convert to plain object for persistence
  toPersistence(): any {
    return {
      id: this.id,
      email: this.props.email.value,
      username: this.props.username,
      passwordHash: this.props.passwordHash,
      firstName: this.props.firstName,
      lastName: this.props.lastName,
      phone: this.props.phone,
      avatar: this.props.avatar,
      role: this.props.role,
      sponsorId: this.props.sponsorId,
      referralCode: this.props.referralCode.value,
      status: this.props.status,
      emailVerified: this.props.emailVerified,
      lastLoginAt: this.props.lastLoginAt,
      quotaPeriodStart: this.props.quotaPeriodStart,
      quotaLimit: this.props.quotaLimit,
      quotaUsed: this.props.quotaUsed,
      lockedAt: this.props.lockedAt,
      lockedReason: this.props.lockedReason,
      approvedAt: this.props.approvedAt,
      approvedBy: this.props.approvedBy,
      rejectedAt: this.props.rejectedAt,
      rejectedBy: this.props.rejectedBy,
      rejectionReason: this.props.rejectionReason,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
