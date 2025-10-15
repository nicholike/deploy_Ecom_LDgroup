import { Module } from '@nestjs/common';
import { CartController } from '../presentation/http/controllers/cart.controller';
import { CartRepository } from '../infrastructure/database/repositories/cart.repository';
import { UserRepository } from '../infrastructure/database/repositories/user.repository';
import { PrismaService } from '../infrastructure/database/prisma.service';

@Module({
  controllers: [CartController],
  providers: [CartRepository, UserRepository, PrismaService],
  exports: [CartRepository],
})
export class CartModule {}
