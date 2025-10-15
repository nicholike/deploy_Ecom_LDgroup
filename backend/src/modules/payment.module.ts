import { Module } from '@nestjs/common';
import { PaymentController } from '@presentation/http/controllers/payment.controller';
import { PaymentService } from '@infrastructure/services/payment/payment.service';
import { BankTransactionRepository } from '@infrastructure/database/repositories/bank-transaction.repository';
import { OrderRepository } from '@infrastructure/database/repositories/order.repository';
import { NotificationRepository } from '@infrastructure/database/repositories/notification.repository';
import { UserRepository } from '@infrastructure/database/repositories/user.repository';
import { CommissionService } from '@infrastructure/services/commission/commission.service';
import { CommissionRepository } from '@infrastructure/database/repositories/commission.repository';
import { WalletRepository } from '@infrastructure/database/repositories/wallet.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Module({
  controllers: [PaymentController],
  providers: [
    PaymentService,
    BankTransactionRepository,
    OrderRepository,
    NotificationRepository,
    UserRepository,
    CommissionService,
    CommissionRepository,
    WalletRepository,
    PrismaService,
  ],
  exports: [PaymentService, BankTransactionRepository],
})
export class PaymentModule {}

