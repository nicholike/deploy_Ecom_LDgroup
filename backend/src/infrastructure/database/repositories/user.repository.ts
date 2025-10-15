import { ConflictException, Injectable } from '@nestjs/common';
import {
  IUserRepository,
  FindUserOptions,
  GetUserTreeOptions,
  UserTreeNode,
} from '@core/domain/user/interfaces/user.repository.interface';
import { User } from '@core/domain/user/entities/user.entity';
import { Email } from '@core/domain/user/value-objects/email.vo';
import { ReferralCode } from '@core/domain/user/value-objects/referral-code.vo';
import { PrismaService } from '../prisma.service';
import { PaginatedResult, PaginationHelper } from '@shared/common/pagination.interface';
import { UserRole, UserStatus } from '@shared/constants/user-roles.constant';
import { Prisma } from '@prisma/client';

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
        include: {
          sponsor: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Return raw Prisma data to preserve sponsor info
    return PaginationHelper.createPaginatedResult(data as any, total, page, limit);
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

    try {
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
          quotaPeriodStart: data.quotaPeriodStart,
          quotaLimit: data.quotaLimit,
          quotaUsed: data.quotaUsed,
          updatedAt: data.updatedAt,
        },
      });

      // Create user tree entry for self-reference
      const selfEntryExists = await this.prisma.userTree.findUnique({
        where: {
          ancestor_descendant: {
            ancestor: saved.id,
            descendant: saved.id,
          },
        },
      });

      if (!selfEntryExists) {
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

          const treesToCreate = ancestorTrees.some((entry) => entry.ancestor === saved.sponsorId)
            ? ancestorTrees
            : [
                ...ancestorTrees,
                {
                  ancestor: saved.sponsorId,
                  descendant: saved.sponsorId,
                  level: 0,
                },
              ];

          for (const ancestorTree of treesToCreate) {
            await this.createTreeLinkSafe({
              ancestor: ancestorTree.ancestor,
              descendant: saved.id,
              level: ancestorTree.level + 1,
            });
          }
        }
      }

      return this.toDomain(saved);
    } catch (error) {
      this.handlePersistenceError(error);
    }
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

  async phoneExists(phone: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { phone },
    });
    return count > 0;
  }

  async referralCodeExists(code: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { referralCode: code.toUpperCase() },
    });
    return count > 0;
  }

  private async createTreeLinkSafe(data: { ancestor: string; descendant: string; level: number }): Promise<void> {
    try {
      await this.prisma.userTree.create({
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // Duplicate link – safe to ignore.
        return;
      }

      this.handlePersistenceError(error);
    }
  }

  private handlePersistenceError(error: unknown): never {
    console.error('[UserRepository] Persistence error:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const field = this.extractUniqueField(error);
        if (field) {
          throw new ConflictException(`${field} already exists`);
        }
        throw new ConflictException('Duplicate value detected');
      }
    }

    throw error;
  }

  private extractUniqueField(error: Prisma.PrismaClientKnownRequestError): string | null {
    const target = error.meta?.target;
    const fields = Array.isArray(target) ? target : typeof target === 'string' ? [target] : [];

    if (!fields.length) {
      return null;
    }

    const mapping: Record<string, string> = {
      email: 'Email',
      username: 'Username',
      phone: 'Phone number',
      referralCode: 'Referral code',
      referral_code: 'Referral code',
      users_email_key: 'Email',
      users_username_key: 'Username',
      users_phone_key: 'Phone number',
      users_referral_code_key: 'Referral code',
    };

    for (const field of fields) {
      if (mapping[field]) {
        return mapping[field];
      }
    }

    return fields[0];
  }

  async getTree(options: GetUserTreeOptions = {}): Promise<UserTreeNode[]> {
    const { rootId, role, status, maxDepth } = options;

    let descendantIds: string[] | null = null;
    if (rootId) {
      const descendantLinks = await this.prisma.userTree.findMany({
        where: {
          ancestor: rootId,
          level: maxDepth
            ? {
                lte: maxDepth - 1,
              }
            : undefined,
        },
        select: {
          descendant: true,
        },
      });

      if (!descendantLinks.length) {
        // If the closure table does not have the root entry yet, fall back to a single-node tree.
        descendantIds = [rootId];
      } else {
        descendantIds = descendantLinks.map((link) => link.descendant);
      }
    }

    const data = await this.prisma.user.findMany({
      where: {
        ...(descendantIds ? { id: { in: descendantIds } } : {}),
        ...(role ? { role } : {}),
        ...(status ? { status } : {}),
      } as any,
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Always include the requested root even if it was filtered out above.
    if (rootId && !data.some((record) => record.id === rootId)) {
      const rootRecord = await this.prisma.user.findUnique({
        where: { id: rootId },
      });
      if (!rootRecord) {
        return [];
      }
      data.unshift(rootRecord);
    }

    if (!data.length) {
      return [];
    }

    const nodes = new Map<string, UserTreeNode>();

    const ensureNode = (user: User): UserTreeNode => {
      if (!nodes.has(user.id)) {
        nodes.set(user.id, { user, children: [] });
      }
      return nodes.get(user.id)!;
    };

    data.forEach((record) => {
      const domainUser = this.toDomain(record);
      ensureNode(domainUser);
    });

    // Reset children to avoid accidental duplication when calling getTree multiple times.
    nodes.forEach((node) => {
      node.children = [];
    });

    nodes.forEach((node) => {
      const sponsorId = node.user.sponsorId;
      if (sponsorId && sponsorId !== node.user.id && nodes.has(sponsorId)) {
        const parentNode = nodes.get(sponsorId)!;
        parentNode.children.push(node);
      }
    });

    let roots: UserTreeNode[];
    if (rootId) {
      const rootNode = nodes.get(rootId);
      if (!rootNode) {
        return [];
      }
      roots = [rootNode];
    } else {
      roots = Array.from(nodes.values()).filter((node) => {
        const sponsorId = node.user.sponsorId;
        return !sponsorId || sponsorId === node.user.id || !nodes.has(sponsorId);
      });
    }

    const sortRecursively = (node: UserTreeNode) => {
      node.children.sort((a, b) => a.user.createdAt.getTime() - b.user.createdAt.getTime());
      node.children.forEach(sortRecursively);
    };

    roots.sort((a, b) => a.user.createdAt.getTime() - b.user.createdAt.getTime());
    roots.forEach(sortRecursively);

    return roots;
  }

  /**
   * Update user fields (for quota, etc.)
   */
  async update(id: string, data: Partial<{
    quotaPeriodStart: Date | null;
    quotaLimit: number;
    quotaUsed: number;
    firstName: string;
    lastName: string;
    phone: string;
    avatar: string;
    status: UserStatus;
    lockedAt: Date | null;
    lockedReason: string | null;
  }>): Promise<User> {
    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });
    return this.toDomain(updated);
  }

  /**
   * Get user quota info (for purchase limit)
   */
  async getQuotaInfo(userId: string): Promise<{
    quotaLimit: number;
    quotaUsed: number;
    quotaRemaining: number;
    quotaPeriodStart: Date | null;
    quotaPeriodEnd: Date | null;
  } | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        quotaLimit: true,
        quotaUsed: true,
        quotaPeriodStart: true,
      },
    });

    if (!user) return null;

    const quotaPeriodEnd = user.quotaPeriodStart
      ? new Date(user.quotaPeriodStart.getTime() + 30 * 24 * 60 * 60 * 1000) // +30 days
      : null;

    return {
      quotaLimit: user.quotaLimit,
      quotaUsed: user.quotaUsed,
      quotaRemaining: user.quotaLimit - user.quotaUsed,
      quotaPeriodStart: user.quotaPeriodStart,
      quotaPeriodEnd,
    };
  }

  /**
   * Get wallet balance for user
   */
  async getWalletBalance(userId: string): Promise<number> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { balance: true },
    });

    return wallet ? Number(wallet.balance) : 0;
  }

  /**
   * Transfer user to new branch (change sponsor)
   * Reset user as new: cancel commissions, reset quota, rebuild tree
   * Keep: email, username, password, name, phone, orders (for admin tracking)
   */
  async transferBranch(userId: string, newSponsorId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Cancel all commission records (keep for admin tracking)
      await tx.commission.updateMany({
        where: { userId },
        data: {
          status: 'CANCELLED' as any,
          notes: 'Cancelled due to branch transfer',
        },
      });

      // 2. Delete all UserTree entries for this user
      await tx.userTree.deleteMany({
        where: {
          OR: [
            { ancestor: userId },
            { descendant: userId },
          ],
        },
      });

      // 3. Update user: change sponsor, reset quota
      await tx.user.update({
        where: { id: userId },
        data: {
          sponsorId: newSponsorId,
          quotaPeriodStart: null,
          quotaUsed: 0,
        },
      });

      // 4. Reset wallet to 0
      await tx.wallet.upsert({
        where: { userId },
        create: { userId, balance: 0 },
        update: { balance: 0 },
      });

      // 5. Rebuild UserTree for this user
      // Self-reference
      await tx.userTree.create({
        data: {
          ancestor: userId,
          descendant: userId,
          level: 0,
        },
      });

      // Create tree entries for all ancestors of new sponsor
      const ancestorTrees = await tx.userTree.findMany({
        where: { descendant: newSponsorId },
      });

      const treesToCreate = ancestorTrees.some((entry) => entry.ancestor === newSponsorId)
        ? ancestorTrees
        : [
            ...ancestorTrees,
            {
              ancestor: newSponsorId,
              descendant: newSponsorId,
              level: 0,
            },
          ];

      for (const ancestorTree of treesToCreate) {
        try {
          await tx.userTree.create({
            data: {
              ancestor: ancestorTree.ancestor,
              descendant: userId,
              level: ancestorTree.level + 1,
            },
          });
        } catch (error) {
          // Ignore duplicate errors
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code !== 'P2002') {
            throw error;
          }
        }
      }
    });
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
        quotaPeriodStart: data.quotaPeriodStart,
        quotaLimit: data.quotaLimit ?? 300,
        quotaUsed: data.quotaUsed ?? 0,
        lockedAt: data.lockedAt,
        lockedReason: data.lockedReason,
      },
      data.createdAt,
      data.updatedAt,
    );
  }
}
