import { Module } from '@nestjs/common';
import { UserController } from '@presentation/http/controllers/user.controller';
import { UserManagementController } from '@presentation/http/controllers/user-management.controller';
import { CreateUserHandler } from '@core/application/user/commands/create-user/create-user.handler';
import { UpdateUserHandler } from '@core/application/user/commands/update-user/update-user.handler';
import { DeleteUserHandler } from '@core/application/user/commands/delete-user/delete-user.handler';
import { GetUserHandler } from '@core/application/user/queries/get-user/get-user.handler';
import { ListUsersHandler } from '@core/application/user/queries/list-users/list-users.handler';
import { GetUserTreeHandler } from '@core/application/user/queries/get-user-tree/get-user-tree.handler';
import { UserRepository } from '@infrastructure/database/repositories/user.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Module({
  controllers: [UserController, UserManagementController],
  providers: [
    PrismaService,
    // Repository
    UserRepository,
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    // Command handlers
    CreateUserHandler,
    UpdateUserHandler,
    DeleteUserHandler,
    // Query handlers
    GetUserHandler,
    ListUsersHandler,
    GetUserTreeHandler,
  ],
  exports: ['IUserRepository', UserRepository, PrismaService],
})
export class UserModule {}
