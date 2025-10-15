import { Module } from '@nestjs/common';
import { NotificationController } from '@presentation/http/controllers/notification.controller';
import { NotificationRepository } from '@infrastructure/database/repositories/notification.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Module({
  controllers: [NotificationController],
  providers: [NotificationRepository, PrismaService],
  exports: [NotificationRepository],
})
export class NotificationModule {}


