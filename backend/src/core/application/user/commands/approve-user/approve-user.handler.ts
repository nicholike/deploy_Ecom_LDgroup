import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApproveUserCommand } from './approve-user.command';
import { User } from '@core/domain/user/entities/user.entity';
import { IUserRepository } from '@core/domain/user/interfaces/user.repository.interface';
import { UserStatus } from '@shared/constants/user-roles.constant';

@Injectable()
export class ApproveUserHandler {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: ApproveUserCommand): Promise<User> {
    // 1. Load user
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Validate user is PENDING
    if (user.status !== UserStatus.PENDING) {
      throw new BadRequestException(
        `Cannot approve user with status ${user.status}. Only PENDING users can be approved.`
      );
    }

    // 3. Approve user (domain logic)
    user.approve(command.adminId);

    // 4. Save user with updated approval fields
    const savedUser = await this.userRepository.update(user.id, {
      status: user.status,
      approvedAt: user.approvedAt as Date,
      approvedBy: user.approvedBy as string,
    });

    // 5. Create UserTree entries (MLM structure)
    // This connects the user to the sponsor's tree
    await this.userRepository.createUserTreeEntries(user.id);

    // 6. TODO: Send notification to user (future enhancement)
    // await this.notificationService.create({
    //   userId: user.id,
    //   type: 'ACCOUNT_APPROVED',
    //   title: 'Tài khoản đã được phê duyệt',
    //   message: 'Tài khoản của bạn đã được quản trị viên phê duyệt. Bạn có thể đăng nhập ngay bây giờ!',
    // });

    // 7. TODO: Notify sponsor about new downline (future enhancement)
    // if (savedUser.sponsorId) {
    //   await this.notificationService.create({
    //     userId: savedUser.sponsorId,
    //     type: 'NEW_DOWNLINE',
    //     title: 'Bạn có thành viên mới',
    //     message: `${savedUser.username} đã tham gia dưới mạng lưới của bạn!`,
    //   });
    // }

    return savedUser;
  }
}
