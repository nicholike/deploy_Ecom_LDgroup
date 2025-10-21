import { Module } from '@nestjs/common';
import { CartController } from '../presentation/http/controllers/cart.controller';
import { CartRepository } from '../infrastructure/database/repositories/cart.repository';
import { UserRepository } from '../infrastructure/database/repositories/user.repository';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { PricingModule } from './pricing.module';

@Module({
  imports: [PricingModule],
  controllers: [CartController],
  providers: [CartRepository, UserRepository, PrismaService],
  exports: [CartRepository],
})
export class CartModule {}
