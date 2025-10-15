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

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  @ApiResponse({ status: 204 })
  async delete(@Param('id') id: string): Promise<void> {
    const command = new DeleteUserCommand(id);
    await this.deleteUserHandler.execute(command);
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
