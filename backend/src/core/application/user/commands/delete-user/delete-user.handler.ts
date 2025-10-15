import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DeleteUserCommand } from './delete-user.command';
import { IUserRepository } from '@core/domain/user/interfaces/user.repository.interface';

@Injectable()
export class DeleteUserHandler {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    // 1. Find user
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Soft delete (set status to INACTIVE)
    await this.userRepository.delete(command.userId);
  }
}
