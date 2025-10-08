import { Module } from '@nestjs/common';
import { UserController } from '@presentation/http/controllers/user.controller';
import { CreateUserHandler } from '@core/application/user/commands/create-user/create-user.handler';
import { UpdateUserHandler } from '@core/application/user/commands/update-user/update-user.handler';
import { GetUserHandler } from '@core/application/user/queries/get-user/get-user.handler';
import { ListUsersHandler } from '@core/application/user/queries/list-users/list-users.handler';
import { UserRepository } from '@infrastructure/database/repositories/user.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Module({
  controllers: [UserController],
  providers: [
    PrismaService,
    // Repository
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    // Command handlers
    CreateUserHandler,
    UpdateUserHandler,
    // Query handlers
    GetUserHandler,
    ListUsersHandler,
  ],
  exports: ['IUserRepository'],
})
export class UserModule {}
