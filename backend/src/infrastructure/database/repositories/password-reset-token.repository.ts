import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PasswordResetToken } from '@core/domain/auth/entities/password-reset-token.entity';
import { IPasswordResetTokenRepository } from '@core/domain/auth/interfaces/password-reset-token.repository.interface';

@Injectable()
export class PasswordResetTokenRepository implements IPasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(token: PasswordResetToken): Promise<PasswordResetToken> {
    const data = token.toPersistence();
    const created = await this.delegate.create({
      data: {
        id: data.id,
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        usedAt: data.usedAt,
      },
    });

    return this.toDomain(created);
  }

  async findValidByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const record = await this.delegate.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async markAsUsed(id: string): Promise<void> {
    await this.delegate.update({
      where: { id },
      data: {
        usedAt: new Date(),
      },
    });
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    await this.delegate.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });
  }

  async deleteExpired(reference: Date = new Date()): Promise<number> {
    const result = await this.delegate.deleteMany({
      where: {
        expiresAt: {
          lte: reference,
        },
      },
    });

    return result.count;
  }

  private toDomain(record: any): PasswordResetToken {
    return PasswordResetToken.fromPersistence(
      record.id,
      {
        userId: record.userId,
        tokenHash: record.tokenHash,
        expiresAt: record.expiresAt,
        usedAt: record.usedAt,
      },
      record.createdAt,
      record.updatedAt,
    );
  }

  private get delegate() {
    return (this.prisma as any).passwordResetToken;
  }
}
