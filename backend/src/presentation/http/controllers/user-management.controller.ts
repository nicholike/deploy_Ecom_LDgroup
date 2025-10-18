import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserRepository } from '@infrastructure/database/repositories/user.repository';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole, UserStatus } from '@shared/constants/user-roles.constant';
import * as bcrypt from 'bcrypt';

/**
 * USER MANAGEMENT ADMIN CONTROLLER
 * 
 * Extended admin-only endpoints for user management:
 * - Lock/Unlock accounts
 * - View detailed user statistics
 * - Bulk operations
 * - Advanced search and filtering
 */
@ApiTags('Admin - User Management')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class UserManagementController {
  constructor(private readonly userRepository: UserRepository) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200 })
  async getUserStats() {
    const allUsers = await this.userRepository.findMany({ page: 1, limit: 999999 });
    
    const stats = {
      total: allUsers.pagination.total,
      active: 0,
      locked: 0,
      byRole: {
        [UserRole.ADMIN]: 0,
        [UserRole.F1]: 0,
        [UserRole.F2]: 0,
        [UserRole.F3]: 0,
        [UserRole.F4]: 0,
        [UserRole.F5]: 0,
        [UserRole.F6]: 0,
      },
      byFlevel: {
        F1: 0,
        F2: 0,
        F3: 0,
        F4: 0,
        F5: 0,
        F6: 0,
      },
      newThisMonth: 0,
    };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    allUsers.data.forEach((user: any) => {
      // Active/Locked status
      if (user.status === UserStatus.ACTIVE) {
        stats.active++;
      } else {
        stats.locked++;
      }

      // By role
      if (stats.byRole[user.role as UserRole] !== undefined) {
        stats.byRole[user.role as UserRole]++;
      }

      // By F-level (extract from role F1-F6)
      if (user.role && user.role.startsWith('F')) {
        const flevel = user.role as keyof typeof stats.byFlevel;
        stats.byFlevel[flevel]++;
      }

      // New this month
      if (user.createdAt && new Date(user.createdAt) >= startOfMonth) {
        stats.newThisMonth++;
      }
    });

    return {
      success: true,
      data: stats,
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Advanced user search with multiple filters' })
  @ApiResponse({ status: 200 })
  async searchUsers(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('flevel') flevel?: number,
    @Query('status') status?: string,
    @Query('sponsorId') sponsorId?: string,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const result = await this.userRepository.findMany({
      page: Number(page),
      limit: Number(pageSize),
      role: role as UserRole | undefined,
      status: status as UserStatus | undefined,
      search,
      sortBy,
      sortOrder,
    });

    return {
      success: true,
      data: {
        users: result.data,
        pagination: result.pagination,
      },
    };
  }

  @Get(':id/details')
  @ApiOperation({ summary: 'Get detailed user information including stats' })
  @ApiResponse({ status: 200 })
  async getUserDetails(@Param('id') id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Get downline count (children who have this user as sponsor)
    const downlineQuery = await this.userRepository.findMany({
      page: 1,
      limit: 1,
    });
    // Note: We can't filter by sponsorId in findMany, so this is approximate
    const downlineCount = 0; // Will be updated if we add sponsor filtering

    // Get quota info
    const quotaInfo = await this.userRepository.getQuotaInfo(id);

    return {
      success: true,
      data: {
        user,
        stats: {
          directDownlines: downlineCount,
          quotaInfo,
        },
      },
    };
  }

  @Put(':id/lock')
  @ApiOperation({ summary: 'Lock user account' })
  @ApiResponse({ status: 200 })
  async lockUser(@Param('id') id: string, @Body('reason') reason?: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (user.role === UserRole.ADMIN) {
      throw new HttpException('Cannot lock admin account', HttpStatus.FORBIDDEN);
    }

    await this.userRepository.update(id, {
      status: UserStatus.SUSPENDED,
      lockedAt: new Date(),
      lockedReason: reason || 'Locked by admin',
    });

    return {
      success: true,
      message: 'User account locked successfully',
      userId: id,
    };
  }

  @Put(':id/unlock')
  @ApiOperation({ summary: 'Unlock user account' })
  @ApiResponse({ status: 200 })
  async unlockUser(@Param('id') id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    await this.userRepository.update(id, {
      status: UserStatus.ACTIVE,
      lockedAt: null,
      lockedReason: null,
    });

    return {
      success: true,
      message: 'User account unlocked successfully',
      userId: id,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user information' })
  @ApiResponse({ status: 200 })
  async updateUser(@Param('id') id: string, @Body() updateData: any) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (user.role === UserRole.ADMIN) {
      throw new HttpException('Cannot update admin account', HttpStatus.FORBIDDEN);
    }

    // Only allow updating specific fields
    const allowedFields: any = {};
    if (updateData.firstName !== undefined) allowedFields.firstName = updateData.firstName;
    if (updateData.lastName !== undefined) allowedFields.lastName = updateData.lastName;
    if (updateData.phone !== undefined) allowedFields.phone = updateData.phone;
    if (updateData.avatar !== undefined) allowedFields.avatar = updateData.avatar;

    const updatedUser = await this.userRepository.update(id, allowedFields);

    return {
      success: true,
      message: 'User information updated successfully',
      data: updatedUser,
    };
  }

  @Put(':id/change-sponsor')
  @ApiOperation({ summary: 'Change user sponsor (transfer to different branch)' })
  @ApiResponse({ status: 200 })
  async changeSponsor(@Param('id') id: string, @Body() body: { newSponsorId: string }) {
    const { newSponsorId } = body;

    if (!newSponsorId) {
      throw new HttpException('New sponsor ID is required', HttpStatus.BAD_REQUEST);
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (user.role === UserRole.ADMIN) {
      throw new HttpException('Cannot change sponsor for admin account', HttpStatus.FORBIDDEN);
    }

    // Check if new sponsor exists
    const newSponsor = await this.userRepository.findById(newSponsorId);
    if (!newSponsor) {
      throw new HttpException('New sponsor not found', HttpStatus.NOT_FOUND);
    }

    // Check if new sponsor is active
    if (newSponsor.status !== UserStatus.ACTIVE) {
      throw new HttpException('New sponsor account is not active', HttpStatus.BAD_REQUEST);
    }

    // Prevent self-sponsorship
    if (id === newSponsorId) {
      throw new HttpException('User cannot sponsor themselves', HttpStatus.BAD_REQUEST);
    }

    // Transfer to new branch
    await this.userRepository.transferBranch(id, newSponsorId);

    return {
      success: true,
      message: 'User transferred to new branch successfully. All commissions cancelled and wallet reset to 0.',
      userId: id,
      newSponsorId,
    };
  }

  @Post('bulk-lock')
  @ApiOperation({ summary: 'Lock multiple user accounts' })
  @ApiResponse({ status: 200 })
  async bulkLockUsers(@Body() body: { userIds: string[]; reason?: string }) {
    const { userIds, reason } = body;

    if (!userIds || userIds.length === 0) {
      throw new HttpException('User IDs required', HttpStatus.BAD_REQUEST);
    }

    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    for (const userId of userIds) {
      try {
        const user = await this.userRepository.findById(userId);
        if (!user) {
          results.failed.push({ id: userId, error: 'User not found' });
          continue;
        }

        if (user.role === UserRole.ADMIN) {
          results.failed.push({ id: userId, error: 'Cannot lock admin account' });
          continue;
        }

        await this.userRepository.update(userId, {
          status: UserStatus.SUSPENDED,
          lockedAt: new Date(),
          lockedReason: reason || 'Bulk locked by admin',
        });

        results.success.push(userId);
      } catch (error) {
        results.failed.push({
          id: userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: true,
      data: results,
      message: `Locked ${results.success.length} users, ${results.failed.length} failed`,
    };
  }

  @Post('bulk-unlock')
  @ApiOperation({ summary: 'Unlock multiple user accounts' })
  @ApiResponse({ status: 200 })
  async bulkUnlockUsers(@Body() body: { userIds: string[] }) {
    const { userIds } = body;

    if (!userIds || userIds.length === 0) {
      throw new HttpException('User IDs required', HttpStatus.BAD_REQUEST);
    }

    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    for (const userId of userIds) {
      try {
        const user = await this.userRepository.findById(userId);
        if (!user) {
          results.failed.push({ id: userId, error: 'User not found' });
          continue;
        }

        await this.userRepository.update(userId, {
          status: UserStatus.ACTIVE,
          lockedAt: null,
          lockedReason: null,
        });

        results.success.push(userId);
      } catch (error) {
        results.failed.push({
          id: userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: true,
      data: results,
      message: `Unlocked ${results.success.length} users, ${results.failed.length} failed`,
    };
  }

  /**
   * Admin: Reset password for a user
   * 🔐 Use case: When user forgets password and contacts admin
   */
  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Admin reset password for a user' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  async resetUserPassword(
    @Param('id') userId: string,
    @Body() body: { newPassword: string },
  ) {
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      throw new HttpException(
        'Password must be at least 6 characters',
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update user password
    user.changePassword(passwordHash);
    await this.userRepository.save(user);

    return {
      success: true,
      message: `Password reset successfully for user: ${user.username}`,
      data: {
        userId: user.id,
        username: user.username,
        email: user.email.value,
        newPassword: newPassword, // Return for admin to tell user
      },
    };
  }

  // Note: getUserTree and changeSponsor methods removed temporarily
  // Will be implemented when full tree query support is added
}

