import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateUserDto } from '../dto/user/create-user.dto';
import { UpdateUserDto } from '../dto/user/update-user.dto';
import { UserResponseDto } from '../dto/user/user-response.dto';
import { GetUserTreeDto } from '../dto/user/get-user-tree.dto';
import { UserTreeNodeDto } from '../dto/user/user-tree-node.dto';
import { PaginationDto } from '../dto/shared/pagination.dto';
import { CreateUserCommand } from '@core/application/user/commands/create-user/create-user.command';
import { CreateUserHandler } from '@core/application/user/commands/create-user/create-user.handler';
import { UpdateUserCommand } from '@core/application/user/commands/update-user/update-user.command';
import { UpdateUserHandler } from '@core/application/user/commands/update-user/update-user.handler';
import { DeleteUserCommand } from '@core/application/user/commands/delete-user/delete-user.command';
import { DeleteUserHandler } from '@core/application/user/commands/delete-user/delete-user.handler';
import { GetUserQuery } from '@core/application/user/queries/get-user/get-user.query';
import { GetUserHandler } from '@core/application/user/queries/get-user/get-user.handler';
import { ListUsersQuery } from '@core/application/user/queries/list-users/list-users.query';
import { ListUsersHandler } from '@core/application/user/queries/list-users/list-users.handler';
import { GetUserTreeQuery } from '@core/application/user/queries/get-user-tree/get-user-tree.query';
import { GetUserTreeHandler } from '@core/application/user/queries/get-user-tree/get-user-tree.handler';
import { GetPendingUsersQuery } from '@core/application/user/queries/get-pending-users/get-pending-users.query';
import { GetPendingUsersHandler } from '@core/application/user/queries/get-pending-users/get-pending-users.handler';
import { ApproveUserCommand } from '@core/application/user/commands/approve-user/approve-user.command';
import { ApproveUserHandler } from '@core/application/user/commands/approve-user/approve-user.handler';
import { RejectUserCommand } from '@core/application/user/commands/reject-user/reject-user.command';
import { RejectUserHandler } from '@core/application/user/commands/reject-user/reject-user.handler';
import { UserTreeNode } from '@core/domain/user/interfaces/user.repository.interface';
import { UserRepository } from '@infrastructure/database/repositories/user.repository';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@shared/constants/user-roles.constant';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { Inject } from '@nestjs/common';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UserController {
  constructor(
    private readonly createUserHandler: CreateUserHandler,
    private readonly updateUserHandler: UpdateUserHandler,
    private readonly deleteUserHandler: DeleteUserHandler,
    private readonly getUserHandler: GetUserHandler,
    private readonly listUsersHandler: ListUsersHandler,
    private readonly getUserTreeHandler: GetUserTreeHandler,
    private readonly getPendingUsersHandler: GetPendingUsersHandler,
    private readonly approveUserHandler: ApproveUserHandler,
    private readonly rejectUserHandler: RejectUserHandler,
    private readonly userRepository: UserRepository,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new user (Admin only)' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    const command = new CreateUserCommand(
      dto.email,
      dto.username,
      dto.password,
      dto.role,
      dto.sponsorId,
      dto.firstName,
      dto.lastName,
      dto.phone,
    );

    const user = await this.createUserHandler.execute(command);
    return UserResponseDto.fromDomain(user);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List users with pagination' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  async list(@Query() query: PaginationDto) {
    const listQuery = new ListUsersQuery(query.page, query.limit, query.role, query.status, query.search);

    const result = await this.listUsersHandler.execute(listQuery);

    return {
      data: result.data.map((user) => UserResponseDto.fromDomain(user)),
      pagination: result.pagination,
    };
  }

  @Get('tree')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List users as MLM tree' })
  @ApiResponse({ status: 200, type: [UserTreeNodeDto] })
  async getTree(@Query() query: GetUserTreeDto) {
    const treeQuery = new GetUserTreeQuery(query.rootId, query.role, query.status, query.maxDepth);
    const tree = await this.getUserTreeHandler.execute(treeQuery);

    const mapNode = (node: UserTreeNode): UserTreeNodeDto =>
      UserTreeNodeDto.from(UserResponseDto.fromDomain(node.user), node.children.map(mapNode));

    return {
      data: tree.map(mapNode),
    };
  }

  @Get('pending')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get pending users awaiting approval (Admin only)' })
  @ApiResponse({ status: 200 })
  async getPendingUsers(@Query() query: PaginationDto) {
    const pendingQuery = new GetPendingUsersQuery(query.page, query.limit, query.search);
    const result = await this.getPendingUsersHandler.execute(pendingQuery);

    return {
      data: result.data,  // Returns raw data with sponsor info
      pagination: result.pagination,
    };
  }

  @Get('quota/me')
  @ApiOperation({ summary: 'Get purchase quota info for current user' })
  @ApiResponse({ status: 200 })
  async getMyQuota(@CurrentUser('userId') userId: string) {
    const quota = await this.userRepository.getQuotaInfo(userId);
    if (!quota) {
      throw new HttpException('Không tìm thấy người dùng', HttpStatus.NOT_FOUND);
    }

    const now = new Date();
    const isPeriodExpired = quota.quotaPeriodEnd && now > quota.quotaPeriodEnd;

    return {
      ...quota,
      isPeriodExpired,
      message: isPeriodExpired
        ? 'Kỳ hạn mua hàng của bạn đã hết. Đặt đơn hàng tiếp theo để bắt đầu kỳ hạn 30 ngày mới.'
        : quota.quotaPeriodStart
        ? `Bạn có thể mua thêm ${quota.quotaRemaining} sản phẩm cho đến ${quota.quotaPeriodEnd?.toISOString().split('T')[0]}`
        : 'Chưa có kỳ hạn mua hàng. Đơn hàng đầu tiên của bạn sẽ bắt đầu kỳ hạn 30 ngày.',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('userId') currentUserId: string,
    @CurrentUser('role') currentUserRole: string,
  ): Promise<UserResponseDto> {
    // Non-admin users can only view their own profile
    if (currentUserRole !== UserRole.ADMIN && id !== currentUserId) {
      throw new HttpException('Bạn chỉ có thể xem hồ sơ của chính mình', HttpStatus.FORBIDDEN);
    }

    const query = new GetUserQuery(id);
    const user = await this.getUserHandler.execute(query);
    return UserResponseDto.fromDomain(user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('userId') currentUserId: string,
    @CurrentUser('role') currentUserRole: string,
  ): Promise<UserResponseDto> {
    // Non-admin users can only update their own profile
    if (currentUserRole !== UserRole.ADMIN && id !== currentUserId) {
      throw new HttpException('Bạn chỉ có thể cập nhật hồ sơ của chính mình', HttpStatus.FORBIDDEN);
    }

    const command = new UpdateUserCommand(id, dto);
    const user = await this.updateUserHandler.execute(command);
    return UserResponseDto.fromDomain(user);
  }

  @Get(':id/delete-check')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Check if user can be deleted and get warnings (Admin only)' })
  @ApiResponse({ status: 200 })
  async checkDelete(@Param('id') id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new HttpException('Không tìm thấy người dùng', HttpStatus.NOT_FOUND);
    }

    // Check hard blocks
    const blocks: string[] = [];

    // Cannot delete ROOT ADMIN (other admins can be deleted)
    if (user.role === UserRole.ADMIN) {
      const rootAdmin = await this.userRepository.findRootAdmin();
      if (rootAdmin && user.id === rootAdmin.id) {
        blocks.push('Không thể xóa tài khoản Root Admin (admin đầu tiên)');
      }
    }

    // Cannot delete if has downline
    const downlineCount = await this.userRepository.findMany({
      page: 1,
      limit: 1,
      sponsorId: id,
    });

    // Get actual count from database for accurate number
    const actualDownlineCount = await this.userRepository.findMany({
      page: 1,
      limit: 999999,
      sponsorId: id,
    });
    const activeDownlineCount = actualDownlineCount.data.filter(
      (u: any) => u.status !== 'INACTIVE' && u.status !== 'REJECTED'
    ).length;

    if (activeDownlineCount > 0) {
      blocks.push(`Còn ${activeDownlineCount} tuyến dưới (phải xóa từ dưới lên)`);
    }

    // Get warnings from handler
    const warnings = await this.deleteUserHandler.checkDeleteWarnings(id);

    return {
      success: true,
      data: {
        canDelete: blocks.length === 0,
        blocks,
        warnings: warnings.warnings,
        walletBalance: warnings.walletBalance,
        requireConfirmation: warnings.hasWarnings,
      },
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user (soft delete) - Admin only' })
  @ApiResponse({ status: 200 })
  async delete(
    @Param('id') id: string,
    @Query('confirmed') confirmed?: string,
  ) {
    const isConfirmed = confirmed === 'true';
    const command = new DeleteUserCommand(id, isConfirmed);

    try {
      await this.deleteUserHandler.execute(command);
      return {
        success: true,
        message: 'Đã xóa tài khoản thành công',
      };
    } catch (error: any) {
      // Try to parse confirmation required error
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.code === 'CONFIRMATION_REQUIRED') {
          throw new HttpException(errorData, HttpStatus.PRECONDITION_REQUIRED);
        }
      } catch (parseError) {
        // Not a JSON error, throw original
      }
      throw error;
    }
  }

  @Post('quota/:userId/reset')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reset user quota (Admin only)' })
  @ApiResponse({ status: 200 })
  async resetQuota(@Param('userId') userId: string) {
    await this.userRepository.update(userId, {
      quotaPeriodStart: null,
      quotaUsed: 0,
    });

    return {
      message: 'Đã đặt lại hạn mức thành công',
      userId,
    };
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve pending user (Admin only)' })
  @ApiResponse({ status: 200 })
  async approveUser(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
  ) {
    const command = new ApproveUserCommand(id, adminId);
    const user = await this.approveUserHandler.execute(command);

    return {
      message: 'Đã phê duyệt tài khoản thành công',
      user: UserResponseDto.fromDomain(user),
    };
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject pending user (Admin only)' })
  @ApiResponse({ status: 200 })
  async rejectUser(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
    @Body() body: { reason: string },
  ) {
    if (!body.reason || body.reason.trim().length === 0) {
      throw new HttpException('Lý do từ chối là bắt buộc', HttpStatus.BAD_REQUEST);
    }

    const command = new RejectUserCommand(id, adminId, body.reason);
    const user = await this.rejectUserHandler.execute(command);

    return {
      message: 'Đã từ chối tài khoản',
      user: UserResponseDto.fromDomain(user),
    };
  }

  @Post(':userId/transfer-branch')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Transfer user to new branch (change sponsor) - Admin only' })
  @ApiResponse({ status: 200 })
  async transferBranch(
    @Param('userId') userId: string,
    @Body() body: { newSponsorId: string },
  ) {
    const { newSponsorId } = body;

    // 1. Get user info
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new HttpException('Không tìm thấy người dùng', HttpStatus.NOT_FOUND);
    }

    // 2. Check new sponsor exists
    const newSponsor = await this.userRepository.findById(newSponsorId);
    if (!newSponsor) {
      throw new HttpException('Không tìm thấy người giới thiệu mới', HttpStatus.NOT_FOUND);
    }

    // 3. Check wallet balance = 0
    const walletBalance = await this.userRepository.getWalletBalance(userId);
    if (walletBalance !== 0) {
      throw new HttpException(
        `Không thể chuyển nhánh. Số dư ví phải bằng 0. Số dư hiện tại: ${walletBalance.toLocaleString('vi-VN')} VND`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 4. Perform transfer (reset as new user with new sponsor)
    await this.userRepository.transferBranch(userId, newSponsorId);

    return {
      message: 'Đã chuyển người dùng sang nhánh mới thành công',
      userId,
      oldSponsorId: user.sponsorId,
      newSponsorId,
    };
  }
}
