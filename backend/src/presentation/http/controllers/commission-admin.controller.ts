import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@shared/constants/user-roles.constant';
import { CommissionStatus } from '@prisma/client';
import { CommissionService } from '@infrastructure/services/commission/commission.service';
import { CommissionRepository } from '@infrastructure/database/repositories/commission.repository';

/**
 * COMMISSION ADMIN CONTROLLER
 *
 * Admin endpoints for commission management:
 * - View all commissions with filters
 * - View commission details
 * - View commission statistics (all users or specific user)
 */
@Controller('admin/commissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class CommissionAdminController {
  constructor(
    private readonly commissionService: CommissionService,
    private readonly commissionRepository: CommissionRepository,
  ) {}

  /**
   * GET /admin/commissions
   * Get all commissions with filters and pagination
   * Query params: page, limit, userId, period, status, fromDate, toDate
   */
  @Get()
  async getAllCommissions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('period') period?: string,
    @Query('status') status?: CommissionStatus,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const skip = (pageNum - 1) * limitNum;

    const filters: any = {};
    if (userId) filters.userId = userId;
    if (period) filters.period = period;
    if (status) filters.status = status;
    if (fromDate) filters.fromDate = new Date(fromDate);
    if (toDate) filters.toDate = new Date(toDate);

    const result = await this.commissionRepository.findAll(skip, limitNum, filters);

    return {
      data: result.data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum),
      },
    };
  }

  /**
   * GET /admin/commissions/:id
   * Get commission detail by ID
   */
  @Get(':id')
  async getCommissionById(@Query('id') id: string) {
    const commission = await this.commissionRepository.findById(id);

    if (!commission) {
      throw new HttpException('Commission not found', HttpStatus.NOT_FOUND);
    }

    return commission;
  }

  /**
   * GET /admin/commissions/stats
   * Get commission statistics across all users or specific user
   * Query params: userId (optional), fromDate, toDate
   */
  @Get('stats/all')
  async getCommissionStats(
    @Query('userId') userId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;

    return this.commissionService.getCommissionStats(userId, from, to);
  }

  /**
   * GET /admin/commissions/user/:userId/summary
   * Get commission summary for a specific user
   */
  @Get('user/:userId/summary')
  async getUserCommissionSummary(@Query('userId') userId: string) {
    if (!userId) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    return this.commissionService.getCommissionSummary(userId);
  }
}
