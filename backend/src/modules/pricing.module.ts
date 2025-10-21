import { Module } from '@nestjs/common';
import { PricingService } from '@infrastructure/services/pricing/pricing.service';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Module({
  providers: [PricingService, PrismaService],
  exports: [PricingService],
})
export class PricingModule {}
