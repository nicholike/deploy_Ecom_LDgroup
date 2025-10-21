import { Module } from '@nestjs/common';
import { PaymentController } from '@presentation/http/controllers/payment.controller';
import { PaymentService } from '@infrastructure/services/payment/payment.service';
import { BankTransactionRepository } from '@infrastructure/database/repositories/bank-transaction.repository';
import { OrderRepository } from '@infrastructure/database/repositories/order.repository';
import { NotificationRepository } from '@infrastructure/database/repositories/notification.repository';
import { UserRepository } from '@infrastructure/database/repositories/user.repository';
import { CartRepository } from '@infrastructure/database/repositories/cart.repository';
import { PendingOrderRepository } from '@infrastructure/database/repositories/pending-order.repository';
import { ProductRepository } from '@infrastructure/database/repositories/product.repository';
import { CommissionService } from '@infrastructure/services/commission/commission.service';
import { CommissionRepository } from '@infrastructure/database/repositories/commission.repository';
import { WalletRepository } from '@infrastructure/database/repositories/wallet.repository';
import { PendingOrderService } from '@infrastructure/services/pending-order/pending-order.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { EmailModule } from '@infrastructure/services/email/email.module';
import { PricingModule } from './pricing.module';

@Module({
  imports: [EmailModule, PricingModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    BankTransactionRepository,
    OrderRepository,
    NotificationRepository,
    UserRepository,
    CartRepository,
    PendingOrderRepository,
    ProductRepository,
    CommissionService,
    CommissionRepository,
    WalletRepository,
    PendingOrderService,
    PrismaService,
  ],
  exports: [PaymentService, BankTransactionRepository],
})
export class PaymentModule {}

