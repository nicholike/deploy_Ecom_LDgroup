import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@shared/constants/user-roles.constant';
import {
  NotificationRepository,
  CreateNotificationDTO,
} from '@infrastructure/database/repositories/notification.repository';
import { NotificationType } from '@prisma/client';

/**
 * NOTIFICATION CONTROLLER
 * 
 * User notifications:
 * - Get notifications
 * - Mark as read
 * - Get unread count
 * 
 * Admin functions:
 * - Send broadcast notifications
 * - Delete old notifications
 */
@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  // ========================================
  // USER ENDPOINTS
  // ========================================

  @Get()
  @ApiOperation({ summary: 'Get notifications for current user' })
  @ApiResponse({ status: 200 })
  async getMyNotifications(
    @Request() req: any,
    @Query('read') read?: string,
    @Query('type') type?: NotificationType,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const userId = req.user.sub;

    const notifications = await this.notificationRepository.findMany({
      userId,
      read: read !== undefined ? read === 'true' : undefined,
      type,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });

    const unreadCount = await this.notificationRepository.getUnreadCount(userId);

    return {
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200 })
  async getUnreadCount(@Request() req: any) {
    const userId = req.user.sub;
    const count = await this.notificationRepository.getUnreadCount(userId);

    return {
      success: true,
      data: { count },
    };
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200 })
  async markAsRead(@Request() req: any, @Param('id') notificationId: string) {
    const userId = req.user.sub;

    // Verify ownership
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) {
      throw new HttpException('Notification not found', HttpStatus.NOT_FOUND);
    }
    if (notification.userId !== userId) {
      throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
    }

    const updated = await this.notificationRepository.markAsRead(notificationId);

    return {
      success: true,
      message: 'Notification marked as read',
      data: updated,
    };
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200 })
  async markAllAsRead(@Request() req: any) {
    const userId = req.user.sub;
    const count = await this.notificationRepository.markAllAsRead(userId);

    return {
      success: true,
      message: `Marked ${count} notifications as read`,
      data: { count },
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({ status: 200 })
  async deleteNotification(@Request() req: any, @Param('id') notificationId: string) {
    const userId = req.user.sub;

    // Verify ownership
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) {
      throw new HttpException('Notification not found', HttpStatus.NOT_FOUND);
    }
    if (notification.userId !== userId) {
      throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
    }

    await this.notificationRepository.delete(notificationId);

    return {
      success: true,
      message: 'Notification deleted',
    };
  }

  // ========================================
  // ADMIN ENDPOINTS
  // ========================================

  @Post('broadcast')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Send broadcast notification to all users or specific users' })
  @ApiResponse({ status: 201 })
  async sendBroadcast(
    @Body()
    body: {
      userIds?: string[]; // If specified, send only to these users
      type: NotificationType;
      title: string;
      message: string;
      actionUrl?: string;
      actionText?: string;
    },
  ) {
    const notifications: CreateNotificationDTO[] = [];

    if (body.userIds && body.userIds.length > 0) {
      // Send to specific users
      body.userIds.forEach((userId) => {
        notifications.push({
          userId,
          type: body.type,
          title: body.title,
          message: body.message,
          actionUrl: body.actionUrl,
          actionText: body.actionText,
        });
      });
    } else {
      // TODO: Send to all active users
      throw new HttpException('userIds is required for now', HttpStatus.BAD_REQUEST);
    }

    const count = await this.notificationRepository.createMany(notifications);

    return {
      success: true,
      message: `Broadcast sent to ${count} users`,
      data: { count },
    };
  }

  @Delete('admin/cleanup')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete old notifications (90 days+)' })
  @ApiResponse({ status: 200 })
  async cleanupOldNotifications(@Query('daysOld') daysOld?: string) {
    const days = daysOld ? parseInt(daysOld) : 90;
    const count = await this.notificationRepository.deleteOldNotifications(days);

    return {
      success: true,
      message: `Deleted ${count} old notifications`,
      data: { count },
    };
  }

  @Get('admin/stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get notification statistics' })
  @ApiResponse({ status: 200 })
  async getStats() {
    // This is a placeholder - you can implement more detailed stats if needed
    return {
      success: true,
      data: {
        message: 'Notification stats not yet implemented',
      },
    };
  }
}


