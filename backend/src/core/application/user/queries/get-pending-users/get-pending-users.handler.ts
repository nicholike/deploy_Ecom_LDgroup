import { Injectable, Inject } from '@nestjs/common';
import { GetPendingUsersQuery } from './get-pending-users.query';
import { User } from '@core/domain/user/entities/user.entity';
import { IUserRepository } from '@core/domain/user/interfaces/user.repository.interface';
import { PaginatedResult } from '@shared/common/pagination.interface';
import { UserStatus } from '@shared/constants/user-roles.constant';

@Injectable()
export class GetPendingUsersHandler {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(query: GetPendingUsersQuery): Promise<PaginatedResult<any>> {
    // Get pending users with sponsor information included
    const result = await this.userRepository.findMany({
      page: query.page,
      limit: query.limit,
      status: UserStatus.PENDING,
      search: query.search,
    });

    // Note: findMany returns raw Prisma data with sponsor info (see repository line 99)
    // This includes sponsor.username and sponsor.role which admin needs to see
    return result;
  }
}
