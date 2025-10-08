import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { UpdateUserCommand } from './update-user.command';
import { User } from '@core/domain/user/entities/user.entity';
import { IUserRepository } from '@core/domain/user/interfaces/user.repository.interface';

@Injectable()
export class UpdateUserHandler {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: UpdateUserCommand): Promise<User> {
    // 1. Find user
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Update profile
    user.updateProfile(command.data);

    // 3. Save
    return this.userRepository.save(user);
  }
}
