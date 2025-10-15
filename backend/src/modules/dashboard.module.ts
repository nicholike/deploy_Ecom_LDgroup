import { Module } from '@nestjs/common';
import { DashboardController } from '@presentation/http/controllers/dashboard.controller';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { OrderRepository } from '@infrastructure/database/repositories/order.repository';
import { UserRepository } from '@infrastructure/database/repositories/user.repository';
import { CommissionModule } from './commission.module';

@Module({
  imports: [CommissionModule],
  controllers: [DashboardController],
  providers: [
    PrismaService,
    OrderRepository,
    UserRepository,
  ],
})
export class DashboardModule {}


