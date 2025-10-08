import { Injectable } from '@nestjs/common';
import { IUserRepository, FindUserOptions } from '@core/domain/user/interfaces/user.repository.interface';
import { User } from '@core/domain/user/entities/user.entity';
import { Email } from '@core/domain/user/value-objects/email.vo';
import { ReferralCode } from '@core/domain/user/value-objects/referral-code.vo';
import { PrismaService } from '../prisma.service';
import { PaginatedResult, PaginationHelper } from '@shared/common/pagination.interface';
import { UserRole, UserStatus } from '@shared/constants/user-roles.constant';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const data = await this.prisma.user.findUnique({
      where: { id },
    });

    return data ? this.toDomain(data) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const data = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    return data ? this.toDomain(data) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const data = await this.prisma.user.findUnique({
      where: { username },
    });

    return data ? this.toDomain(data) : null;
  }

  async findByReferralCode(code: string): Promise<User | null> {
    const data = await this.prisma.user.findUnique({
      where: { referralCode: code.toUpperCase() },
    });

    return data ? this.toDomain(data) : null;
  }

  async findMany(options: FindUserOptions): Promise<PaginatedResult<User>> {
    const { page, limit, skip } = PaginationHelper.getPaginationParams(options);

    const where: any = {};

    if (options.role) {
      where.role = options.role;
    }

    if (options.status) {
      where.status = options.status;
    }

    if (options.sponsorId) {
      where.sponsorId = options.sponsorId;
    }

    if (options.search) {
      where.OR = [
        { email: { contains: options.search } },
        { username: { contains: options.search } },
        { firstName: { contains: options.search } },
        { lastName: { contains: options.search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const users = data.map((d) => this.toDomain(d));

    return PaginationHelper.createPaginatedResult(users, total, page, limit);
  }

  async findDownline(userId: string, options: any = {}): Promise<PaginatedResult<User>> {
    const { page, limit, skip } = PaginationHelper.getPaginationParams(options);

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { sponsorId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: { sponsorId: userId } }),
    ]);

    const users = data.map((d) => this.toDomain(d));

    return PaginationHelper.createPaginatedResult(users, total, page, limit);
  }

  async findUplineChain(userId: string, maxLevel: number = 4): Promise<User[]> {
    const uplineChain: User[] = [];
    let currentUserId: string | null = userId;

    for (let i = 0; i < maxLevel; i++) {
      const user = await this.prisma.user.findUnique({
        where: { id: currentUserId as string },
        select: { sponsorId: true },
      });

      if (!user || !user.sponsorId) {
        break;
      }

      const sponsor = await this.findById(user.sponsorId);
      if (sponsor) {
        uplineChain.push(sponsor);
        currentUserId = sponsor.id;
      } else {
        break;
      }
    }

    return uplineChain;
  }

  async save(user: User): Promise<User> {
    const data = user.toPersistence();

    const saved = await this.prisma.user.upsert({
      where: { id: data.id },
      create: data,
      update: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        avatar: data.avatar,
        passwordHash: data.passwordHash,
        status: data.status,
        emailVerified: data.emailVerified,
        lastLoginAt: data.lastLoginAt,
        updatedAt: data.updatedAt,
      },
    });

    // Create user tree entry for self-reference
    if (!await this.prisma.userTree.findUnique({
      where: {
        ancestor_descendant: {
          ancestor: saved.id,
          descendant: saved.id,
        },
      },
    })) {
      await this.prisma.userTree.create({
        data: {
          ancestor: saved.id,
          descendant: saved.id,
          level: 0,
        },
      });

      // Create tree entries for all ancestors
      if (saved.sponsorId) {
        const ancestorTrees = await this.prisma.userTree.findMany({
          where: { descendant: saved.sponsorId },
        });

        for (const ancestorTree of ancestorTrees) {
          await this.prisma.userTree.create({
            data: {
              ancestor: ancestorTree.ancestor,
              descendant: saved.id,
              level: ancestorTree.level + 1,
            },
          });
        }
      }
    }

    return this.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.INACTIVE },
    });
  }

  async emailExists(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email: email.toLowerCase() },
    });
    return count > 0;
  }

  async usernameExists(username: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { username },
    });
    return count > 0;
  }

  async referralCodeExists(code: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { referralCode: code.toUpperCase() },
    });
    return count > 0;
  }

  // Helper method to convert Prisma model to Domain entity
  private toDomain(data: any): User {
    return User.fromPersistence(
      data.id,
      {
        email: Email.create(data.email),
        username: data.username,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        avatar: data.avatar,
        role: data.role as UserRole,
        sponsorId: data.sponsorId,
        referralCode: ReferralCode.create(data.referralCode),
        status: data.status as UserStatus,
        emailVerified: data.emailVerified,
        lastLoginAt: data.lastLoginAt,
      },
      data.createdAt,
      data.updatedAt,
    );
  }
}
