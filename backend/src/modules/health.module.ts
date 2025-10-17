import { Module } from '@nestjs/common';
import { HealthController } from '@presentation/http/controllers/health.controller';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Module({
  controllers: [HealthController],
  providers: [PrismaService],
})
export class HealthModule {}
