import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WithdrawalRequest, WithdrawalStatus } from '@prisma/client';

@Injectable()
export class WithdrawalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    amount: number;
    bankInfo: any;
    userNote?: string;
  }): Promise<WithdrawalRequest> {
    return this.prisma.withdrawalRequest.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        bankInfo: data.bankInfo,
        userNote: data.userNote,
        status: WithdrawalStatus.PENDING,
      },
    });
  }

  async findById(id: string): Promise<WithdrawalRequest | null> {
    return this.prisma.withdrawalRequest.findUnique({
      where: { id },
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

  async findByUserId(
    userId: string,
    skip: number = 0,
    take: number = 10,
    status?: WithdrawalStatus,
  ) {
    const where: any = { userId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.withdrawalRequest.findMany({
        where,
        skip,
        take,
        orderBy: { requestedAt: 'desc' },
      }),
      this.prisma.withdrawalRequest.count({ where }),
    ]);

    return { data, total };
  }

  async findAll(
    skip: number = 0,
    take: number = 10,
    filters?: {
      status?: WithdrawalStatus;
      userId?: string;
      fromDate?: Date;
      toDate?: Date;
    },
  ) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.fromDate || filters?.toDate) {
      where.requestedAt = {};
      if (filters.fromDate) where.requestedAt.gte = filters.fromDate;
      if (filters.toDate) where.requestedAt.lte = filters.toDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.withdrawalRequest.findMany({
        where,
        skip,
        take,
        orderBy: { requestedAt: 'desc' },
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
      }),
      this.prisma.withdrawalRequest.count({ where }),
    ]);

    return { data, total };
  }

  async updateStatus(
    id: string,
    status: WithdrawalStatus,
    processedBy?: string,
    adminNote?: string,
    rejectReason?: string,
  ): Promise<WithdrawalRequest> {
    const data: any = { status };

    if (processedBy) {
      data.processedBy = processedBy;
      data.processedAt = new Date();
    }

    if (status === WithdrawalStatus.COMPLETED) {
      data.completedAt = new Date();
    }

    if (adminNote) data.adminNote = adminNote;
    if (rejectReason) data.rejectReason = rejectReason;

    return this.prisma.withdrawalRequest.update({
      where: { id },
      data,
    });
  }

  async getStats(userId?: string, fromDate?: Date, toDate?: Date) {
    const where: any = {};
    if (userId) where.userId = userId;
    if (fromDate || toDate) {
      where.requestedAt = {};
      if (fromDate) where.requestedAt.gte = fromDate;
      if (toDate) where.requestedAt.lte = toDate;
    }

    const [total, completed, pending, rejected] = await Promise.all([
      this.prisma.withdrawalRequest.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.withdrawalRequest.aggregate({
        where: { ...where, status: WithdrawalStatus.COMPLETED },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.withdrawalRequest.aggregate({
        where: { ...where, status: WithdrawalStatus.PENDING },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.withdrawalRequest.aggregate({
        where: { ...where, status: WithdrawalStatus.REJECTED },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      total: {
        amount: Number(total._sum.amount || 0),
        count: total._count,
      },
      completed: {
        amount: Number(completed._sum.amount || 0),
        count: completed._count,
      },
      pending: {
        amount: Number(pending._sum.amount || 0),
        count: pending._count,
      },
      rejected: {
        amount: Number(rejected._sum.amount || 0),
        count: rejected._count,
      },
    };
  }
}
