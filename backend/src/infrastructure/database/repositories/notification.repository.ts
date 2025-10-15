import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Notification, NotificationType, Prisma } from '@prisma/client';

export interface CreateNotificationDTO {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  metadata?: any;
}

export interface FindNotificationsOptions {
  userId: string;
  read?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a notification
   */
  async create(data: CreateNotificationDTO): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
        actionText: data.actionText,
        metadata: data.metadata ? (data.metadata as Prisma.JsonObject) : undefined,
      },
    });
  }

  /**
   * Create multiple notifications (bulk)
   */
  async createMany(notifications: CreateNotificationDTO[]): Promise<number> {
    const result = await this.prisma.notification.createMany({
      data: notifications.map((n) => ({
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        actionUrl: n.actionUrl,
        actionText: n.actionText,
        metadata: n.metadata ? (n.metadata as Prisma.JsonObject) : undefined,
      })),
    });
    return result.count;
  }

  /**
   * Find notifications by user ID with filters
   */
  async findMany(options: FindNotificationsOptions): Promise<Notification[]> {
    const where: Prisma.NotificationWhereInput = {
      userId: options.userId,
    };

    if (options.read !== undefined) {
      where.read = options.read;
    }

    if (options.type) {
      where.type = options.type;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0,
    });
  }

  /**
   * Count notifications
   */
  async count(options: { userId: string; read?: boolean }): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId: options.userId,
        read: options.read,
      },
    });
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
    return result.count;
  }

  /**
   * Delete old notifications
   * @param daysOld - Delete notifications older than X days
   */
  async deleteOldNotifications(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        read: true, // Only delete read notifications
      },
    });

    return result.count;
  }

  /**
   * Delete a notification by ID
   */
  async delete(notificationId: string): Promise<void> {
    await this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  /**
   * Find notification by ID
   */
  async findById(notificationId: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
  }
}


