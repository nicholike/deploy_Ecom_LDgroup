import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Commission, CommissionStatus } from '@prisma/client';

export interface CommissionSummary {
  totalEarned: number;
  totalPending: number;
  totalApproved: number;
  availableBalance: number;
}

export interface CommissionStats {
  period: string;
  totalAmount: number;
  count: number;
}

@Injectable()
export class CommissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    orderId: string;
    fromUserId: string;
    level: number;
    orderValue: number;
    commissionRate: number;
    commissionAmount: number;
    period: string;
    status: CommissionStatus;
  }): Promise<Commission> {
    return this.prisma.commission.create({
      data: {
        userId: data.userId,
        orderId: data.orderId,
        fromUserId: data.fromUserId,
        level: data.level,
        orderValue: data.orderValue,
        commissionRate: data.commissionRate,
        commissionAmount: data.commissionAmount,
        period: data.period,
        status: data.status,
        calculatedAt: new Date(),
      },
    });
  }

  async findById(id: string): Promise<Commission | null> {
    return this.prisma.commission.findUnique({
      where: { id },
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
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            status: true,
          },
        },
      },
    });
  }

  async findByUserId(
    userId: string,
    skip: number = 0,
    take: number = 10,
    period?: string,
    status?: CommissionStatus,
  ) {
    const where: any = { userId };
    if (period) where.period = period;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.commission.findMany({
        where,
        skip,
        take,
        orderBy: { calculatedAt: 'desc' },
        include: {
          order: {
            select: {
              orderNumber: true,
              totalAmount: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.commission.count({ where }),
    ]);

    return { data, total };
  }

  async findByOrderId(orderId: string): Promise<Commission[]> {
    return this.prisma.commission.findMany({
      where: { orderId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });
  }

  async findAll(
    skip: number = 0,
    take: number = 10,
    filters?: {
      userId?: string;
      period?: string;
      status?: CommissionStatus;
      fromDate?: Date;
      toDate?: Date;
    },
  ) {
    const where: any = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.period) where.period = filters.period;
    if (filters?.status) where.status = filters.status;
    if (filters?.fromDate || filters?.toDate) {
      where.calculatedAt = {};
      if (filters.fromDate) where.calculatedAt.gte = filters.fromDate;
      if (filters.toDate) where.calculatedAt.lte = filters.toDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.commission.findMany({
        where,
        skip,
        take,
        orderBy: { calculatedAt: 'desc' },
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
          order: {
            select: {
              orderNumber: true,
              totalAmount: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.commission.count({ where }),
    ]);

    return { data, total };
  }

  async getSummary(userId: string): Promise<CommissionSummary> {
    const [approved, pending] = await Promise.all([
      this.prisma.commission.aggregate({
        where: { userId, status: CommissionStatus.APPROVED },
        _sum: { commissionAmount: true },
      }),
      this.prisma.commission.aggregate({
        where: { userId, status: CommissionStatus.PENDING },
        _sum: { commissionAmount: true },
      }),
    ]);

    const totalApproved = Number(approved._sum.commissionAmount || 0);
    const totalPending = Number(pending._sum.commissionAmount || 0);

    return {
      totalEarned: totalApproved + totalPending,
      totalPending,
      totalApproved,
      availableBalance: totalApproved, // This will be synced with wallet balance
    };
  }

  async getStats(
    userId?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<CommissionStats[]> {
    const where: any = { status: CommissionStatus.APPROVED };
    if (userId) where.userId = userId;
    if (fromDate || toDate) {
      where.calculatedAt = {};
      if (fromDate) where.calculatedAt.gte = fromDate;
      if (toDate) where.calculatedAt.lte = toDate;
    }

    const results = await this.prisma.commission.groupBy({
      by: ['period'],
      where,
      _sum: { commissionAmount: true },
      _count: true,
      orderBy: { period: 'desc' },
    });

    return results.map((r) => ({
      period: r.period,
      totalAmount: Number(r._sum.commissionAmount || 0),
      count: r._count,
    }));
  }

  async updateStatus(
    id: string,
    status: CommissionStatus,
    notes?: string,
  ): Promise<Commission> {
    const data: any = { status };
    if (status === CommissionStatus.APPROVED) {
      data.approvedAt = new Date();
    } else if (status === CommissionStatus.REJECTED) {
      data.rejectedAt = new Date();
    } else if (status === CommissionStatus.PAID) {
      data.paidAt = new Date();
    }
    if (notes) data.notes = notes;

    return this.prisma.commission.update({
      where: { id },
      data,
    });
  }

  async updateStatusByOrderId(
    orderId: string,
    status: CommissionStatus,
  ): Promise<number> {
    const result = await this.prisma.commission.updateMany({
      where: { orderId },
      data: {
        status,
        ...(status === CommissionStatus.CANCELLED && {
          rejectedAt: new Date(),
        }),
      },
    });

    return result.count;
  }

  async getActiveCommissionConfig() {
    return this.prisma.commissionConfig.findMany({
      where: { active: true },
      orderBy: { level: 'asc' },
    });
  }
}
