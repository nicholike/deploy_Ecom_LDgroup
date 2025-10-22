import { Module } from '@nestjs/common';
import { SettingsController } from '@presentation/http/controllers/settings.controller';
import { PublicSettingsController } from '@presentation/http/controllers/public-settings.controller';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PricingModule } from './pricing.module';

@Module({
  imports: [PricingModule],
  controllers: [SettingsController, PublicSettingsController],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class SettingsModule {}


