import { Module, forwardRef } from '@nestjs/common';
import { OrderController } from '../presentation/http/controllers/order.controller';
import { OrderRepository } from '../infrastructure/database/repositories/order.repository';
import { CartRepository } from '../infrastructure/database/repositories/cart.repository';
import { UserRepository } from '../infrastructure/database/repositories/user.repository';
import { WalletRepository } from '../infrastructure/database/repositories/wallet.repository';
import { PriceTierRepository } from '../infrastructure/database/repositories/price-tier.repository';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { CommissionModule } from './commission.module';

@Module({
  imports: [forwardRef(() => CommissionModule)],
  controllers: [OrderController],
  providers: [
    OrderRepository,
    CartRepository,
    UserRepository,
    WalletRepository,
    PriceTierRepository,
    PrismaService,
  ],
  exports: [OrderRepository],
})
export class OrderModule {}
