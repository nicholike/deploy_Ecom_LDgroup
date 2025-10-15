import { Inject, Injectable } from '@nestjs/common';
import {
  GetUserTreeOptions,
  IUserRepository,
  UserTreeNode,
} from '@core/domain/user/interfaces/user.repository.interface';
import { GetUserTreeQuery } from './get-user-tree.query';

@Injectable()
export class GetUserTreeHandler {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(query: GetUserTreeQuery): Promise<UserTreeNode[]> {
    const options: GetUserTreeOptions = {
      rootId: query.rootId,
      role: query.role,
      status: query.status,
      maxDepth: query.maxDepth,
    };

    return this.userRepository.getTree(options);
  }
}
