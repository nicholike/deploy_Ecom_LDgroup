import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Wallet, WalletTransaction, WalletTransactionType } from '@prisma/client';

@Injectable()
export class WalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateByUserId(userId: string): Promise<Wallet> {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId, balance: 0 },
      });
    }

    return wallet;
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    return this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<Wallet | null> {
    return this.prisma.wallet.findUnique({
      where: { id },
    });
  }

  async getBalance(userId: string): Promise<number> {
    const wallet = await this.findOrCreateByUserId(userId);
    return Number(wallet.balance);
  }

  async addTransaction(data: {
    userId: string;
    type: WalletTransactionType;
    amount: number;
    orderId?: string;
    commissionId?: string;
    withdrawalId?: string;
    description?: string;
  }): Promise<WalletTransaction> {
    const wallet = await this.findOrCreateByUserId(data.userId);
    const balanceBefore = Number(wallet.balance);
    const balanceAfter = balanceBefore + data.amount;

    // Update wallet balance and create transaction in a transaction
    const [transaction] = await this.prisma.$transaction([
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: data.type,
          amount: data.amount,
          balanceBefore,
          balanceAfter,
          orderId: data.orderId,
          commissionId: data.commissionId,
          withdrawalId: data.withdrawalId,
          description: data.description,
        },
      }),
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      }),
    ]);

    return transaction;
  }

  async getTransactions(
    userId: string,
    skip: number = 0,
    take: number = 10,
    type?: WalletTransactionType,
  ) {
    const wallet = await this.findOrCreateByUserId(userId);

    const where: any = { walletId: wallet.id };
    if (type) where.type = type;

    const [data, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);

    return { data, total };
  }

  async findNegativeBalances(limit: number = 100) {
    return this.prisma.wallet.findMany({
      where: {
        balance: { lt: 0 },
      },
      take: limit,
      orderBy: { balance: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
  }

  async getTotalBalances() {
    const result = await this.prisma.wallet.aggregate({
      where: {
        user: {
          role: { not: 'ADMIN' }, // Exclude ADMIN users from stats
        },
      },
      _sum: { balance: true },
      _count: true,
    });

    return {
      totalBalance: Number(result._sum.balance || 0),
      totalWallets: result._count,
    };
  }

  async getTopBalanceUsers(limit: number = 10) {
    const wallets = await this.prisma.wallet.findMany({
      where: {
        user: {
          role: { not: 'ADMIN' }, // Exclude ADMIN users from top list
        },
      },
      take: limit,
      orderBy: {
        balance: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Convert Decimal to number
    return wallets.map((wallet) => ({
      ...wallet,
      balance: Number(wallet.balance),
    }));
  }

  async adminAdjustBalance(
    userId: string,
    amount: number,
    description: string,
    adminId: string,
  ): Promise<WalletTransaction> {
    return this.addTransaction({
      userId,
      type: WalletTransactionType.ADMIN_ADJUSTMENT,
      amount,
      description: `Admin adjustment by ${adminId}: ${description}`,
    });
  }
}
