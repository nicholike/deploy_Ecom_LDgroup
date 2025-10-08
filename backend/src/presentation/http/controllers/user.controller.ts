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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateUserDto } from '../dto/user/create-user.dto';
import { UpdateUserDto } from '../dto/user/update-user.dto';
import { UserResponseDto } from '../dto/user/user-response.dto';
import { PaginationDto } from '../dto/shared/pagination.dto';
import { CreateUserCommand } from '@core/application/user/commands/create-user/create-user.command';
import { CreateUserHandler } from '@core/application/user/commands/create-user/create-user.handler';
import { UpdateUserCommand } from '@core/application/user/commands/update-user/update-user.command';
import { UpdateUserHandler } from '@core/application/user/commands/update-user/update-user.handler';
import { GetUserQuery } from '@core/application/user/queries/get-user/get-user.query';
import { GetUserHandler } from '@core/application/user/queries/get-user/get-user.handler';
import { ListUsersQuery } from '@core/application/user/queries/list-users/list-users.query';
import { ListUsersHandler } from '@core/application/user/queries/list-users/list-users.handler';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@shared/constants/user-roles.constant';
import { CurrentUser } from '@shared/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UserController {
  constructor(
    private readonly createUserHandler: CreateUserHandler,
    private readonly updateUserHandler: UpdateUserHandler,
    private readonly getUserHandler: GetUserHandler,
    private readonly listUsersHandler: ListUsersHandler,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.DISTRIBUTOR)
  @ApiOperation({ summary: 'Create new user' })
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
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List users with pagination' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  async list(@Query() query: PaginationDto) {
    const listQuery = new ListUsersQuery(
      query.page,
      query.limit,
      undefined,
      undefined,
      undefined,
    );

    const result = await this.listUsersHandler.execute(listQuery);

    return {
      data: result.data.map((user) => UserResponseDto.fromDomain(user)),
      pagination: result.pagination,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
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
  ): Promise<UserResponseDto> {
    // Users can only update their own profile (unless admin)
    // This should be enhanced with proper permission check
    
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
    // TODO: Implement delete handler
  }
}
