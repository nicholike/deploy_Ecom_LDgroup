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
import { WithdrawalStatus } from '@prisma/client';
import { WalletService } from '@infrastructure/services/wallet/wallet.service';

/**
 * WITHDRAWAL ADMIN CONTROLLER
 *
 * Admin endpoints for withdrawal request management:
 * - View all withdrawal requests with filters
 * - Approve withdrawal (PENDING → PROCESSING)
 * - Complete withdrawal (PROCESSING → COMPLETED, deduct from wallet)
 * - Reject withdrawal (PENDING → REJECTED)
 * - View withdrawal statistics
 */
@Controller('admin/withdrawals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class WithdrawalAdminController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * GET /admin/withdrawals
   * Get all withdrawal requests with filters and pagination
   * Query params: page, limit, status, userId
   */
  @Get()
  async getAllWithdrawals(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: WithdrawalStatus,
    @Query('userId') userId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    return this.walletService.getAllWithdrawals(pageNum, limitNum, status, userId);
  }

  /**
   * POST /admin/withdrawals/:id/approve
   * Approve withdrawal request (PENDING → PROCESSING)
   * Body: { adminNote? }
   */
  @Post(':id/approve')
  async approveWithdrawal(
    @Param('id') withdrawalId: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    const adminId = req.user.userId;
    const { adminNote } = body;

    if (!withdrawalId) {
      throw new HttpException('Mã yêu cầu rút tiền là bắt buộc', HttpStatus.BAD_REQUEST);
    }

    return this.walletService.approveWithdrawal(withdrawalId, adminId, adminNote);
  }

  /**
   * POST /admin/withdrawals/:id/complete
   * Complete withdrawal (PROCESSING → COMPLETED, deduct from wallet)
   * Body: { adminNote? }
   *
   * IMPORTANT: Admin should only call this AFTER manually transferring money to user's bank account
   */
  @Post(':id/complete')
  async completeWithdrawal(
    @Param('id') withdrawalId: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    const adminId = req.user.userId;
    const { adminNote } = body;

    if (!withdrawalId) {
      throw new HttpException('Mã yêu cầu rút tiền là bắt buộc', HttpStatus.BAD_REQUEST);
    }

    return this.walletService.completeWithdrawal(withdrawalId, adminId, adminNote);
  }

  /**
   * POST /admin/withdrawals/:id/reject
   * Reject withdrawal request (PENDING → REJECTED)
   * Body: { rejectReason (required), adminNote? }
   */
  @Post(':id/reject')
  async rejectWithdrawal(
    @Param('id') withdrawalId: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    const adminId = req.user.userId;
    const { rejectReason, adminNote } = body;

    if (!withdrawalId) {
      throw new HttpException('Mã yêu cầu rút tiền là bắt buộc', HttpStatus.BAD_REQUEST);
    }

    if (!rejectReason) {
      throw new HttpException('Lý do từ chối là bắt buộc', HttpStatus.BAD_REQUEST);
    }

    return this.walletService.rejectWithdrawal(
      withdrawalId,
      adminId,
      rejectReason,
      adminNote,
    );
  }
}
