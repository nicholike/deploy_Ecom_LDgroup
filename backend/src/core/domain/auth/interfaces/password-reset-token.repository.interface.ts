import { PasswordResetToken } from '../entities/password-reset-token.entity';

export interface IPasswordResetTokenRepository {
  create(token: PasswordResetToken): Promise<PasswordResetToken>;
  findValidByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>;
  markAsUsed(id: string): Promise<void>;
  invalidateAllForUser(userId: string): Promise<void>;
  deleteExpired(reference?: Date): Promise<number>;
}
