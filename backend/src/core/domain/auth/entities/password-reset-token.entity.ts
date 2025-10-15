import * as crypto from 'crypto';
import { BaseEntity } from '@shared/common/base.entity';

export interface PasswordResetTokenProps {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
}

export class PasswordResetToken extends BaseEntity {
  private props: PasswordResetTokenProps;

  private constructor(id: string, props: PasswordResetTokenProps, createdAt?: Date, updatedAt?: Date) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  static create(props: PasswordResetTokenProps, id?: string): PasswordResetToken {
    return new PasswordResetToken(id ?? crypto.randomUUID(), props);
  }

  static fromPersistence(
    id: string,
    props: PasswordResetTokenProps,
    createdAt: Date,
    updatedAt: Date,
  ): PasswordResetToken {
    return new PasswordResetToken(id, props, createdAt, updatedAt);
  }

  get userId(): string {
    return this.props.userId;
  }

  get tokenHash(): string {
    return this.props.tokenHash;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get usedAt(): Date | null | undefined {
    return this.props.usedAt;
  }

  markUsed(): void {
    this.props.usedAt = new Date();
    this.updatedAt = new Date();
  }

  isUsed(): boolean {
    return !!this.props.usedAt;
  }

  isExpired(reference: Date = new Date()): boolean {
    return this.props.expiresAt.getTime() <= reference.getTime();
  }

  toPersistence(): any {
    return {
      id: this.id,
      userId: this.props.userId,
      tokenHash: this.props.tokenHash,
      expiresAt: this.props.expiresAt,
      usedAt: this.props.usedAt ?? null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
