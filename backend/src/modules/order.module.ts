import { Module, forwardRef } from '@nestjs/common';
import { OrderController } from '../presentation/http/controllers/order.controller';
import { OrderRepository } from '../infrastructure/database/repositories/order.repository';
import { CartRepository } from '../infrastructure/database/repositories/cart.repository';
import { UserRepository } from '../infrastructure/database/repositories/user.repository';
import { WalletRepository } from '../infrastructure/database/repositories/wallet.repository';
import { PriceTierRepository } from '../infrastructure/database/repositories/price-tier.repository';
import { PendingOrderRepository } from '../infrastructure/database/repositories/pending-order.repository';
import { ProductRepository } from '../infrastructure/database/repositories/product.repository';
import { OrderCleanupService } from '../infrastructure/services/order/order-cleanup.service';
import { PendingOrderService } from '../infrastructure/services/pending-order/pending-order.service';
import { PendingOrderCleanupService } from '../infrastructure/services/pending-order/pending-order-cleanup.service';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { CommissionModule } from './commission.module';
import { EmailModule } from '../infrastructure/services/email/email.module';

@Module({
  imports: [forwardRef(() => CommissionModule), EmailModule],
  controllers: [OrderController],
  providers: [
    OrderRepository,
    CartRepository,
    UserRepository,
    WalletRepository,
    PriceTierRepository,
    PendingOrderRepository,
    ProductRepository,
    OrderCleanupService,
    PendingOrderService,
    PendingOrderCleanupService,
    PrismaService,
  ],
  exports: [OrderRepository, OrderCleanupService, PendingOrderRepository, PendingOrderService, PendingOrderCleanupService],
})
export class OrderModule {}
