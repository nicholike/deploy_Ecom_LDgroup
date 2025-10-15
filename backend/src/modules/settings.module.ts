import { Module } from '@nestjs/common';
import { SettingsController } from '@presentation/http/controllers/settings.controller';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Module({
  controllers: [SettingsController],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class SettingsModule {}


