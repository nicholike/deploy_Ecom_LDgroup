import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RejectUserCommand } from './reject-user.command';
import { User } from '@core/domain/user/entities/user.entity';
import { IUserRepository } from '@core/domain/user/interfaces/user.repository.interface';
import { UserStatus } from '@shared/constants/user-roles.constant';

@Injectable()
export class RejectUserHandler {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: RejectUserCommand): Promise<User> {
    // 1. Load user
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Validate user is PENDING
    if (user.status !== UserStatus.PENDING) {
      throw new BadRequestException(
        `Cannot reject user with status ${user.status}. Only PENDING users can be rejected.`
      );
    }

    // 3. Reject user (domain logic)
    user.reject(command.adminId, command.reason);

    // 4. Save user with updated rejection fields
    const savedUser = await this.userRepository.update(user.id, {
      status: user.status,
      rejectedAt: user.rejectedAt as Date,
      rejectedBy: user.rejectedBy as string,
      rejectionReason: user.rejectionReason as string,
    });

    // 5. TODO: Send notification to user (future enhancement)
    // await this.notificationService.create({
    //   userId: user.id,
    //   type: 'ACCOUNT_REJECTED',
    //   title: 'Tài khoản bị từ chối',
    //   message: `Tài khoản của bạn đã bị từ chối. Lý do: ${command.reason}`,
    // });

    return savedUser;
  }
}
