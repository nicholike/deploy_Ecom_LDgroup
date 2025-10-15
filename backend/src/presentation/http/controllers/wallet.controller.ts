import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@shared/constants/user-roles.constant';
import { WalletTransactionType } from '@prisma/client';
import { WalletService } from '@infrastructure/services/wallet/wallet.service';

/**
 * WALLET CONTROLLER
 *
 * User endpoints:
 * - View wallet balance
 * - View transaction history
 * - Request withdrawal
 * - View withdrawal history
 *
 * Admin endpoints:
 * - View all wallets
 * - View negative balance wallets
 * - View wallet statistics
 * - Manual balance adjustment
 */
@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // ========== USER ENDPOINTS ==========

  /**
   * GET /wallet
   * Get current user's wallet details
   */
  @Get()
  async getWallet(@Request() req: any) {
    const userId = req.user.userId;
    return this.walletService.getWallet(userId);
  }

  /**
   * GET /wallet/balance
   * Get current user's wallet balance
   */
  @Get('balance')
  async getBalance(@Request() req: any) {
    const userId = req.user.userId;
    const balance = await this.walletService.getBalance(userId);
    return { balance };
  }

  /**
   * GET /wallet/transactions
   * Get transaction history for current user
   * Query params: page, limit, type
   */
  @Get('transactions')
  async getTransactions(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: WalletTransactionType,
  ) {
    const userId = req.user.userId;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    return this.walletService.getTransactions(userId, pageNum, limitNum, type);
  }

  /**
   * POST /wallet/withdrawal/request
   * Request withdrawal
   * Body: { amount, bankInfo: { bankName, accountNumber, accountName, branch? }, userNote? }
   */
  @Post('withdrawal/request')
  async requestWithdrawal(@Request() req: any, @Body() body: any) {
    const userId = req.user.userId;
    const { amount, bankInfo, userNote } = body;

    if (!amount || !bankInfo) {
      throw new HttpException(
        'Số tiền và thông tin ngân hàng là bắt buộc',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.walletService.requestWithdrawal(userId, amount, bankInfo, userNote);
  }

  /**
   * GET /wallet/withdrawal/history
   * Get withdrawal history for current user
   * Query params: page, limit
   */
  @Get('withdrawal/history')
  async getWithdrawalHistory(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.userId;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    return this.walletService.getWithdrawalHistory(userId, pageNum, limitNum);
  }

  // ========== ADMIN ENDPOINTS ==========

  /**
   * GET /wallet/admin/negative-balances
   * Get all wallets with negative balance (admin warning)
   */
  @Get('admin/negative-balances')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getNegativeBalanceWallets() {
    return this.walletService.getNegativeBalanceWallets();
  }

  /**
   * GET /wallet/admin/stats
   * Get wallet statistics (total balance, total wallets)
   */
  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getWalletStats() {
    return this.walletService.getWalletStats();
  }

  /**
   * GET /wallet/admin/top-users
   * Get top users by wallet balance
   * Query params: limit (default 10)
   */
  @Get('admin/top-users')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getTopBalanceUsers(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.walletService.getTopBalanceUsers(limitNum);
  }

  /**
   * GET /wallet/admin/user-transactions/:userId
   * Get transaction history for a specific user (admin only)
   * Query params: page, limit, type
   */
  @Get('admin/user-transactions/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getUserTransactions(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: WalletTransactionType,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    if (!userId) {
      throw new HttpException('Mã người dùng là bắt buộc', HttpStatus.BAD_REQUEST);
    }

    return this.walletService.getTransactions(userId, pageNum, limitNum, type);
  }

  /**
   * POST /wallet/admin/adjust-balance
   * Manual balance adjustment by admin
   * Body: { userId, amount, description }
   */
  @Post('admin/adjust-balance')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminAdjustBalance(@Request() req: any, @Body() body: any) {
    const adminId = req.user.userId;
    const { userId, amount, description } = body;

    if (!userId || amount === undefined || !description) {
      throw new HttpException(
        'Mã người dùng, số tiền và mô tả là bắt buộc',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.walletService.adminAdjustBalance(userId, amount, description, adminId);
  }
}
