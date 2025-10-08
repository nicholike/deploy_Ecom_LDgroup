import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { GetUserQuery } from './get-user.query';
import { User } from '@core/domain/user/entities/user.entity';
import { IUserRepository } from '@core/domain/user/interfaces/user.repository.interface';

@Injectable()
export class GetUserHandler {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(query: GetUserQuery): Promise<User> {
    const user = await this.userRepository.findById(query.userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
