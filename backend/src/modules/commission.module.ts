import { Module, forwardRef } from '@nestjs/common';
import { CommissionService } from '@infrastructure/services/commission/commission.service';
import { CommissionRepository } from '@infrastructure/database/repositories/commission.repository';
import { CommissionController } from '@presentation/http/controllers/commission.controller';
import { CommissionAdminController } from '@presentation/http/controllers/commission-admin.controller';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { WalletModule } from './wallet.module';
import { UserModule } from './user.module';
import { EmailModule } from '@infrastructure/services/email/email.module';

/**
 * COMMISSION MODULE
 *
 * Provides:
 * - CommissionService: Core business logic for commission calculation
 * - CommissionRepository: Data access layer
 * - CommissionController: User endpoints
 * - CommissionAdminController: Admin endpoints
 *
 * Exports:
 * - CommissionService (for use in OrderRepository)
 * - CommissionRepository
 */
@Module({
  imports: [
    forwardRef(() => WalletModule), // Circular dependency: Commission needs Wallet
    UserModule, // Commission needs UserRepository for upline chain
    EmailModule, // Email service for commission notifications
  ],
  controllers: [CommissionController, CommissionAdminController],
  providers: [CommissionService, CommissionRepository, PrismaService],
  exports: [CommissionService, CommissionRepository],
})
export class CommissionModule {}
