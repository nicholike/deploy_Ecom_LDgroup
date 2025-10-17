import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RegisterUserCommand } from './register-user.command';
import { User } from '@core/domain/user/entities/user.entity';
import { Email } from '@core/domain/user/value-objects/email.vo';
import { ReferralCode } from '@core/domain/user/value-objects/referral-code.vo';
import { IUserRepository } from '@core/domain/user/interfaces/user.repository.interface';
import { UserStatus } from '@shared/constants/user-roles.constant';
import { CryptoUtil } from '@shared/utils/crypto.util';
import * as bcrypt from 'bcrypt';

@Injectable()
export class RegisterUserHandler {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: RegisterUserCommand): Promise<User> {
    // 1. Validate referral code and find sponsor
    const sponsor = await this.userRepository.findByReferralCode(command.referralCode);
    if (!sponsor) {
      throw new NotFoundException('Mã giới thiệu không tồn tại');
    }

    // 2. Validate sponsor status - must be ACTIVE
    if (sponsor.status !== UserStatus.ACTIVE) {
      throw new BadRequestException(
        `Không thể đăng ký với mã giới thiệu này. Tài khoản người giới thiệu đang ở trạng thái: ${sponsor.status}`
      );
    }

    // 3. Calculate role based on sponsor's role
    // F1 -> F2, F2 -> F3, etc.
    const newUserRole = User.calculateDownlineRole(sponsor.role);

    // 4. Check if email already exists
    const existingUserByEmail = await this.userRepository.findByEmail(command.email);

    // 4a. If email exists with REJECTED status, allow re-registration (update existing record)
    if (existingUserByEmail && existingUserByEmail.status === UserStatus.REJECTED) {
      // Check if new username conflicts with another user
      if (command.username !== existingUserByEmail.username) {
        const usernameConflict = await this.userRepository.usernameExists(command.username);
        if (usernameConflict) {
          throw new ConflictException('Username đã tồn tại. Vui lòng chọn username khác.');
        }
      }

      // Check if new phone conflicts with another user (if provided)
      if (command.phone && command.phone !== existingUserByEmail.phone) {
        const phoneConflict = await this.userRepository.phoneExists(command.phone);
        if (phoneConflict) {
          throw new ConflictException('Số điện thoại đã tồn tại. Vui lòng sử dụng số khác.');
        }
      }

      // Hash password
      const passwordHash = await bcrypt.hash(command.password, 10);

      // Update existing rejected user for re-registration
      const updatedUser = await this.userRepository.update(existingUserByEmail.id, {
        username: command.username,
        passwordHash,
        firstName: command.firstName,
        lastName: command.lastName,
        phone: command.phone,
        role: newUserRole,
        sponsorId: sponsor.id,
        status: UserStatus.PENDING,
        emailVerified: false,
        // Clear rejection fields
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null,
      });

      return updatedUser;
    }

    // 4b. If email exists with other status (ACTIVE, PENDING, etc.), reject
    if (existingUserByEmail) {
      throw new ConflictException('Email đã tồn tại');
    }

    // 5. Check username uniqueness
    const usernameExists = await this.userRepository.usernameExists(command.username);
    if (usernameExists) {
      throw new ConflictException('Username đã tồn tại');
    }

    // 5. Check phone uniqueness (if provided)
    if (command.phone) {
      const phoneExists = await this.userRepository.phoneExists(command.phone);
      if (phoneExists) {
        throw new ConflictException('Số điện thoại đã tồn tại');
      }
    }

    // 6. Hash password
    const passwordHash = await bcrypt.hash(command.password, 10);

    // 7. Generate unique referral code for new user
    let referralCode: string;
    let codeExists = true;

    do {
      referralCode = CryptoUtil.generateReferralCode(newUserRole.substring(0, 2));
      codeExists = await this.userRepository.referralCodeExists(referralCode);
    } while (codeExists);

    // 8. Create user entity with PENDING status
    const user = User.create({
      email: Email.create(command.email),
      username: command.username,
      passwordHash,
      firstName: command.firstName,
      lastName: command.lastName,
      phone: command.phone,
      role: newUserRole,
      sponsorId: sponsor.id,
      referralCode: ReferralCode.create(referralCode),
      status: UserStatus.PENDING, // ← Key difference: PENDING instead of ACTIVE
      emailVerified: false,
      quotaLimit: 300,
      quotaUsed: 0,
    });

    // 9. Save user
    // Note: UserTree entries will be created when admin approves the user
    const savedUser = await this.userRepository.save(user);

    return savedUser;
  }
}
