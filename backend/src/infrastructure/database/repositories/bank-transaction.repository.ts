import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BankTransaction } from '@prisma/client';

export interface CreateBankTransactionInput {
  sepayTransactionId?: number;
  gateway: string;
  transactionDate: Date;
  accountNumber: string;
  subAccount?: string;
  amountIn: number;
  amountOut: number;
  accumulated: number;
  code?: string;
  transactionContent: string;
  referenceNumber?: string;
  body?: string;
  orderId?: string;
}

@Injectable()
export class BankTransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new bank transaction from webhook
   */
  async create(data: CreateBankTransactionInput): Promise<BankTransaction> {
    return this.prisma.bankTransaction.create({
      data: {
        sepayTransactionId: data.sepayTransactionId,
        gateway: data.gateway,
        transactionDate: data.transactionDate,
        accountNumber: data.accountNumber,
        subAccount: data.subAccount,
        amountIn: data.amountIn,
        amountOut: data.amountOut,
        accumulated: data.accumulated,
        code: data.code,
        transactionContent: data.transactionContent,
        referenceNumber: data.referenceNumber,
        body: data.body,
        orderId: data.orderId,
        processed: false,
      },
      include: {
        order: true,
      },
    });
  }

  /**
   * Find transaction by SePay transaction ID
   */
  async findBySepayId(sepayTransactionId: number): Promise<BankTransaction | null> {
    return this.prisma.bankTransaction.findUnique({
      where: { sepayTransactionId },
      include: { order: true },
    });
  }

  /**
   * Find transaction by reference number
   */
  async findByReferenceNumber(referenceNumber: string): Promise<BankTransaction | null> {
    return this.prisma.bankTransaction.findFirst({
      where: { referenceNumber },
      include: { order: true },
    });
  }

  /**
   * Find transactions by order ID
   */
  async findByOrderId(orderId: string): Promise<BankTransaction[]> {
    return this.prisma.bankTransaction.findMany({
      where: { orderId },
      orderBy: { transactionDate: 'desc' },
    });
  }

  /**
   * Search transactions by content (for matching with order code)
   */
  async findByTransactionContent(searchTerm: string): Promise<BankTransaction[]> {
    return this.prisma.bankTransaction.findMany({
      where: {
        transactionContent: {
          contains: searchTerm,
        },
      },
      orderBy: { transactionDate: 'desc' },
      take: 10,
    });
  }

  /**
   * Mark transaction as processed
   */
  async markAsProcessed(id: string, orderId?: string): Promise<BankTransaction> {
    return this.prisma.bankTransaction.update({
      where: { id },
      data: {
        processed: true,
        processedAt: new Date(),
        orderId: orderId || undefined,
      },
    });
  }

  /**
   * Get unprocessed transactions
   */
  async getUnprocessed(limit: number = 100): Promise<BankTransaction[]> {
    return this.prisma.bankTransaction.findMany({
      where: { processed: false },
      orderBy: { transactionDate: 'desc' },
      take: limit,
    });
  }

  /**
   * Get all transactions with pagination
   */
  async findAll(skip: number = 0, take: number = 20) {
    const [data, total] = await Promise.all([
      this.prisma.bankTransaction.findMany({
        skip,
        take,
        orderBy: { transactionDate: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              status: true,
              paymentStatus: true,
            },
          },
        },
      }),
      this.prisma.bankTransaction.count(),
    ]);

    return { data, total };
  }

  /**
   * Get transactions by date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<BankTransaction[]> {
    return this.prisma.bankTransaction.findMany({
      where: {
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { transactionDate: 'desc' },
      include: { order: true },
    });
  }
}


