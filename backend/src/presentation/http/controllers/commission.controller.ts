import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CommissionService } from '@infrastructure/services/commission/commission.service';
import { CommissionRepository } from '@infrastructure/database/repositories/commission.repository';
import { CommissionStatus } from '@prisma/client';

/**
 * COMMISSION CONTROLLER (USER)
 *
 * User endpoints:
 * - View their own commission summary
 * - View their own commission details with pagination
 * - View commission statistics
 */
@Controller('commissions')
@UseGuards(JwtAuthGuard)
export class CommissionController {
  constructor(
    private readonly commissionService: CommissionService,
    private readonly commissionRepository: CommissionRepository,
  ) {}

  /**
   * GET /commissions/summary
   * Get commission summary for current user
   * Returns: totalEarned, totalPending, totalApproved, availableBalance
   */
  @Get('summary')
  async getSummary(@Request() req: any) {
    const userId = req.user.userId;
    return this.commissionService.getCommissionSummary(userId);
  }

  /**
   * GET /commissions
   * Get commission details for current user with pagination
   * Query params: page, limit, period, status
   */
  @Get()
  async getCommissions(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('period') period?: string,
    @Query('status') status?: CommissionStatus,
  ) {
    const userId = req.user.userId;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const skip = (pageNum - 1) * limitNum;
    const result = await this.commissionRepository.findByUserId(
      userId,
      skip,
      limitNum,
      period,
      status,
    );

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
   * GET /commissions/stats
   * Get commission statistics by period
   * Returns monthly breakdown of commissions
   */
  @Get('stats')
  async getStats(
    @Request() req: any,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const userId = req.user.userId;
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;

    return this.commissionService.getCommissionStats(userId, from, to);
  }

  /**
   * GET /commissions/:id
   * Get commission detail by ID (user can only view their own commissions)
   */
  @Get(':id')
  async getCommissionById(@Request() req: any, @Query('id') id: string) {
    const userId = req.user.userId;
    const commission = await this.commissionRepository.findById(id);

    if (!commission) {
      throw new HttpException('Commission not found', HttpStatus.NOT_FOUND);
    }

    // Users can only view their own commissions
    if (commission.userId !== userId) {
      throw new HttpException(
        'You can only view your own commissions',
        HttpStatus.FORBIDDEN,
      );
    }

    return commission;
  }
}
