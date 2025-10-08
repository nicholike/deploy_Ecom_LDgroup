import { Injectable, Inject } from '@nestjs/common';
import { ListUsersQuery } from './list-users.query';
import { User } from '@core/domain/user/entities/user.entity';
import { IUserRepository } from '@core/domain/user/interfaces/user.repository.interface';
import { PaginatedResult } from '@shared/common/pagination.interface';

@Injectable()
export class ListUsersHandler {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(query: ListUsersQuery): Promise<PaginatedResult<User>> {
    return this.userRepository.findMany({
      page: query.page,
      limit: query.limit,
      role: query.role,
      status: query.status,
      search: query.search,
    });
  }
}
