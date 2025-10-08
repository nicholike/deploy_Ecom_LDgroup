import { BaseEntity } from '@shared/common/base.entity';
import { UserRole, UserStatus } from '@shared/constants/user-roles.constant';
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
  static fromPersistence(
    id: string,
    props: UserProps,
    createdAt: Date,
    updatedAt: Date,
  ): User {
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
    if (this.props.status === UserStatus.INACTIVE) {
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

  canCreateRole(targetRole: UserRole): boolean {
    const permissions = {
      [UserRole.ADMIN]: [UserRole.ADMIN, UserRole.MANAGER],
      [UserRole.MANAGER]: [UserRole.DISTRIBUTOR],
      [UserRole.DISTRIBUTOR]: [UserRole.CUSTOMER],
      [UserRole.CUSTOMER]: [UserRole.CUSTOMER],
    };

    return permissions[this.props.role]?.includes(targetRole) || false;
  }

  isActive(): boolean {
    return this.props.status === UserStatus.ACTIVE;
  }

  isAdmin(): boolean {
    return this.props.role === UserRole.ADMIN;
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
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
