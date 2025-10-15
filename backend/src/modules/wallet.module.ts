import { Module } from '@nestjs/common';
import { WalletService } from '@infrastructure/services/wallet/wallet.service';
import { WalletRepository } from '@infrastructure/database/repositories/wallet.repository';
import { WithdrawalRepository } from '@infrastructure/database/repositories/withdrawal.repository';
import { WalletController } from '@presentation/http/controllers/wallet.controller';
import { WithdrawalAdminController } from '@presentation/http/controllers/withdrawal-admin.controller';
import { PrismaService } from '@infrastructure/database/prisma.service';

/**
 * WALLET MODULE
 *
 * Provides:
 * - WalletService: Wallet balance, transactions, withdrawal management
 * - WalletRepository: Wallet data access
 * - WithdrawalRepository: Withdrawal request data access
 * - WalletController: User wallet & withdrawal endpoints
 * - WithdrawalAdminController: Admin withdrawal management endpoints
 *
 * Exports:
 * - WalletService
 * - WalletRepository (for use in CommissionService)
 * - WithdrawalRepository
 */
@Module({
  controllers: [WalletController, WithdrawalAdminController],
  providers: [
    WalletService,
    WalletRepository,
    WithdrawalRepository,
    PrismaService,
  ],
  exports: [WalletService, WalletRepository, WithdrawalRepository],
})
export class WalletModule {}
