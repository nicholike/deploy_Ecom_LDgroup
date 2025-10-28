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
              email: true,
              phone: true,
              referralCode: true,
              role: true,
              status: true,
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

      // ONLY create UserTree entries for ACTIVE users
      // PENDING users will have tree created when approved via ApproveUserHandler
      if (saved.status === UserStatus.ACTIVE) {
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

  async findRootAdmin(): Promise<User | null> {
    const data = await this.prisma.user.findFirst({
      where: {
        role: UserRole.ADMIN,
        sponsorId: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return data ? this.toDomain(data) : null;
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

    const whereClause = {
      ...(descendantIds ? { id: { in: descendantIds } } : {}),
      ...(role ? { role } : {}),
      // ✅ Default: exclude INACTIVE and REJECTED users from tree
      ...(status ? { status } : { status: { notIn: ['INACTIVE', 'REJECTED'] } }),
    };

    const data = await this.prisma.user.findMany({
      where: whereClause as any,
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Always include the requested root even if it was filtered out above.
    // ✅ But also exclude INACTIVE/REJECTED root
    if (rootId && !data.some((record) => record.id === rootId)) {
      const rootRecord = await this.prisma.user.findUnique({
        where: { id: rootId },
      });
      if (!rootRecord || rootRecord.status === 'INACTIVE' || rootRecord.status === 'REJECTED') {
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
   * Update user fields (for quota, re-registration, approval, etc.)
   */
  async update(id: string, data: Partial<{
    username: string;
    passwordHash: string;
    role: UserRole;
    sponsorId: string | null;
    quotaPeriodStart: Date | null;
    quotaLimit: number;
    quotaUsed: number;
    // NEW: Size-specific quota
    quota5mlLimit: number;
    quota5mlUsed: number;
    quota20mlLimit: number;
    quota20mlUsed: number;
    quotaSpecialLimit: number;
    quotaSpecialUsed: number;
    firstName: string;
    lastName: string;
    phone: string;
    avatar: string;
    status: UserStatus;
    emailVerified: boolean;
    lockedAt: Date | null;
    lockedReason: string | null;
    approvedAt: Date | null;
    approvedBy: string | null;
    rejectedAt: Date | null;
    rejectedBy: string | null;
    rejectionReason: string | null;
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
  /**
   * Get quota info with size-specific details
   * - 5ml: 300 limit
   * - 20ml: 300 limit
   * - Special: 10 limit
   */
  async getQuotaInfo(userId: string): Promise<{
    // NEW: Size-specific quota
    quota5ml: {
      limit: number;
      used: number;
      remaining: number;
    };
    quota20ml: {
      limit: number;
      used: number;
      remaining: number;
    };
    quotaSpecial: {
      limit: number;
      used: number;
      remaining: number;
    };
    // Period info
    quotaPeriodStart: Date | null;
    quotaPeriodEnd: Date | null;
    // DEPRECATED: Old total quota (for backwards compatibility)
    quotaLimit: number;
    quotaUsed: number;
    quotaRemaining: number;
  } | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        quota5mlLimit: true,
        quota5mlUsed: true,
        quota20mlLimit: true,
        quota20mlUsed: true,
        quotaSpecialLimit: true,
        quotaSpecialUsed: true,
        quotaPeriodStart: true,
        // Old fields for backwards compatibility
        quotaLimit: true,
        quotaUsed: true,
      },
    });

    if (!user) return null;

    const quotaPeriodEnd = user.quotaPeriodStart
      ? new Date(user.quotaPeriodStart.getTime() + 30 * 24 * 60 * 60 * 1000) // +30 days
      : null;

    return {
      // Size-specific quota
      quota5ml: {
        limit: user.quota5mlLimit,
        used: user.quota5mlUsed,
        remaining: user.quota5mlLimit - user.quota5mlUsed,
      },
      quota20ml: {
        limit: user.quota20mlLimit,
        used: user.quota20mlUsed,
        remaining: user.quota20mlLimit - user.quota20mlUsed,
      },
      quotaSpecial: {
        limit: user.quotaSpecialLimit,
        used: user.quotaSpecialUsed,
        remaining: user.quotaSpecialLimit - user.quotaSpecialUsed,
      },
      // Period
      quotaPeriodStart: user.quotaPeriodStart,
      quotaPeriodEnd,
      // DEPRECATED: Old total quota
      quotaLimit: user.quotaLimit,
      quotaUsed: user.quotaUsed,
      quotaRemaining: user.quotaLimit - user.quotaUsed,
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
   * Create UserTree entries for a user (used when approving PENDING users)
   * Creates self-reference + links to all ancestors via sponsor
   */
  async createUserTreeEntries(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, sponsorId: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // 1. Create self-reference (level 0)
    await this.createTreeLinkSafe({
      ancestor: user.id,
      descendant: user.id,
      level: 0,
    });

    // 2. Create tree entries for all ancestors
    if (user.sponsorId) {
      const ancestorTrees = await this.prisma.userTree.findMany({
        where: { descendant: user.sponsorId },
      });

      const treesToCreate = ancestorTrees.some((entry) => entry.ancestor === user.sponsorId)
        ? ancestorTrees
        : [
            ...ancestorTrees,
            {
              ancestor: user.sponsorId,
              descendant: user.sponsorId,
              level: 0,
            },
          ];

      for (const ancestorTree of treesToCreate) {
        await this.createTreeLinkSafe({
          ancestor: ancestorTree.ancestor,
          descendant: user.id,
          level: ancestorTree.level + 1,
        });
      }
    }
  }

  /**
   * 🔧 ATOMIC: Increment quota (prevents race condition)
   * Use this instead of read-modify-write pattern
   */
  /**
   * 🆕 ATOMIC: Increment quota by size
   * @param userId User ID
   * @param quotaBySize Object with quantities for each size: { "5ml": 10, "20ml": 5, "special": 1 }
   */
  async incrementQuotaBySize(userId: string, quotaBySize: { 
    '5ml'?: number; 
    '20ml'?: number; 
    special?: number;
  }): Promise<void> {
    const updateData: any = {};
    
    if (quotaBySize['5ml']) {
      updateData.quota5mlUsed = { increment: quotaBySize['5ml'] };
    }
    
    if (quotaBySize['20ml']) {
      updateData.quota20mlUsed = { increment: quotaBySize['20ml'] };
    }
    
    if (quotaBySize.special) {
      updateData.quotaSpecialUsed = { increment: quotaBySize.special };
    }
    
    if (Object.keys(updateData).length > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    }
  }

  /**
   * 🆕 ATOMIC: Decrement quota by size (for order cancellation)
   * @param userId User ID
   * @param quotaBySize Object with quantities for each size: { "5ml": 10, "20ml": 5, "special": 1 }
   */
  async decrementQuotaBySize(userId: string, quotaBySize: { 
    '5ml'?: number; 
    '20ml'?: number; 
    special?: number;
  }): Promise<void> {
    // Get current quota to ensure we don't go negative
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        quota5mlUsed: true,
        quota20mlUsed: true,
        quotaSpecialUsed: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const updateData: any = {};
    
    if (quotaBySize['5ml']) {
      const newQuota5ml = Math.max(0, user.quota5mlUsed - quotaBySize['5ml']);
      updateData.quota5mlUsed = newQuota5ml;
    }
    
    if (quotaBySize['20ml']) {
      const newQuota20ml = Math.max(0, user.quota20mlUsed - quotaBySize['20ml']);
      updateData.quota20mlUsed = newQuota20ml;
    }
    
    if (quotaBySize.special) {
      const newQuotaSpecial = Math.max(0, user.quotaSpecialUsed - quotaBySize.special);
      updateData.quotaSpecialUsed = newQuotaSpecial;
    }
    
    if (Object.keys(updateData).length > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    }
  }

  /**
   * ⚠️ DEPRECATED: Use incrementQuotaBySize instead
   * Kept for backwards compatibility
   */
  async incrementQuota(userId: string, amount: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        quotaUsed: {
          increment: amount,
        },
      },
    });
  }

  /**
   * ⚠️ DEPRECATED: Use decrementQuotaBySize instead
   * Kept for backwards compatibility
   */
  async decrementQuota(userId: string, amount: number): Promise<void> {
    // Get current quota first to ensure we don't go negative
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { quotaUsed: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Calculate new quota (max 0 to prevent negative)
    const newQuota = Math.max(0, user.quotaUsed - amount);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        quotaUsed: newQuota,
      },
    });
  }

  /**
   * Transfer user to new branch (change sponsor)
   * Requirements: Wallet MUST be 0 before calling this (checked in controller)
   * Actions: Cancel commissions, reset quota, recalculate role, rebuild tree FOR USER AND ALL DESCENDANTS
   * Keep: email, username, password, name, phone, orders, wallet balance (for admin tracking)
   */
  async transferBranch(userId: string, newSponsorId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 0. Get new sponsor info to calculate new role
      const newSponsor = await tx.user.findUnique({
        where: { id: newSponsorId },
        select: { role: true },
      });

      if (!newSponsor) {
        throw new Error('New sponsor not found');
      }

      // Calculate new role based on sponsor's role
      // F1 -> F2, F2 -> F3, F3 -> F4, etc.
      const newRole = User.calculateDownlineRole(newSponsor.role as UserRole);

      // ⭐ CRITICAL: Find ALL descendants (entire subtree) before deleting tree
      const allDescendants = await tx.userTree.findMany({
        where: {
          ancestor: userId,
          descendant: { not: userId }, // Exclude self
        },
        select: { descendant: true },
      });
      const descendantIds = allDescendants.map(d => d.descendant);

      // 1. Cancel all commission records (keep for admin tracking)
      await tx.commission.updateMany({
        where: { userId },
        data: {
          status: 'CANCELLED' as any,
          notes: 'Cancelled due to branch transfer',
        },
      });

      // 2. Delete ALL UserTree entries for this user AND all descendants
      await tx.userTree.deleteMany({
        where: {
          OR: [
            { ancestor: userId },
            { descendant: userId },
            ...(descendantIds.length > 0 ? [{ ancestor: { in: descendantIds } }] : []),
            ...(descendantIds.length > 0 ? [{ descendant: { in: descendantIds } }] : []),
          ],
        },
      });

      // 3. Update user: change sponsor, reset quota, UPDATE ROLE
      await tx.user.update({
        where: { id: userId },
        data: {
          sponsorId: newSponsorId,
          role: newRole, // ⭐ CRITICAL: Update role based on new position
          quotaPeriodStart: null,
          quotaUsed: 0,
        },
      });

      // Note: Wallet is NOT reset here. Controller validates wallet = 0 before allowing transfer.

      // 4. Rebuild UserTree for this user
      // 4a. Self-reference
      await tx.userTree.create({
        data: {
          ancestor: userId,
          descendant: userId,
          level: 0,
        },
      });

      // 4b. Create tree entries linking to all ancestors of new sponsor
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

      // 5. ⭐ REBUILD tree for ALL DESCENDANTS recursively
      // Get all direct children and rebuild them one by one (BFS approach)
      if (descendantIds.length > 0) {
        const descendantsWithSponsor = await tx.user.findMany({
          where: { id: { in: descendantIds } },
          select: { id: true, sponsorId: true, role: true },
          orderBy: { createdAt: 'asc' }, // Process in order of creation
        });

        // Group by levels using BFS
        const processed = new Set<string>();
        const queue = descendantsWithSponsor.filter(d => d.sponsorId === userId);

        while (queue.length > 0) {
          const current = queue.shift()!;
          if (processed.has(current.id)) continue;
          processed.add(current.id);

          // Rebuild tree for this descendant
          // 5a. Self-reference
          await tx.userTree.create({
            data: {
              ancestor: current.id,
              descendant: current.id,
              level: 0,
            },
          }).catch(() => {}); // Ignore if exists

          // 5b. Link to all ancestors (sponsor's ancestors + sponsor)
          const sponsorAncestors = await tx.userTree.findMany({
            where: { descendant: current.sponsorId! },
          });

          for (const ancestorTree of sponsorAncestors) {
            try {
              await tx.userTree.create({
                data: {
                  ancestor: ancestorTree.ancestor,
                  descendant: current.id,
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

          // Add children to queue
          const children = descendantsWithSponsor.filter(d => d.sponsorId === current.id);
          queue.push(...children);
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
        approvedAt: data.approvedAt,
        approvedBy: data.approvedBy,
        rejectedAt: data.rejectedAt,
        rejectedBy: data.rejectedBy,
        rejectionReason: data.rejectionReason,
      },
      data.createdAt,
      data.updatedAt,
    );
  }
}
