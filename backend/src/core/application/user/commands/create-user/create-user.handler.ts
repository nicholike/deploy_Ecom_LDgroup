import { Injectable, Inject, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateUserCommand } from './create-user.command';
import { User } from '@core/domain/user/entities/user.entity';
import { Email } from '@core/domain/user/value-objects/email.vo';
import { ReferralCode } from '@core/domain/user/value-objects/referral-code.vo';
import { IUserRepository } from '@core/domain/user/interfaces/user.repository.interface';
import { UserStatus } from '@shared/constants/user-roles.constant';
import { CryptoUtil } from '@shared/utils/crypto.util';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CreateUserHandler {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    // 1. Validate sponsor exists and has permission to create this role
    const sponsor = await this.userRepository.findById(command.sponsorId);
    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    if (!sponsor.canCreateRole(command.role)) {
      throw new ForbiddenException(
        `${sponsor.role} cannot create users with role ${command.role}`,
      );
    }

    // 2. Check email uniqueness
    const emailExists = await this.userRepository.emailExists(command.email);
    if (emailExists) {
      throw new ConflictException('Email already exists');
    }

    // 3. Check username uniqueness
    const usernameExists = await this.userRepository.usernameExists(command.username);
    if (usernameExists) {
      throw new ConflictException('Username already exists');
    }

    // 4. Check phone uniqueness (if provided)
    if (command.phone) {
      // TODO: Implement phone check if needed
    }

    // 5. Hash password
    const passwordHash = await bcrypt.hash(command.password, 10);

    // 6. Generate unique referral code
    let referralCode: string;
    let codeExists = true;
    
    do {
      referralCode = CryptoUtil.generateReferralCode(command.role.substring(0, 2));
      codeExists = await this.userRepository.referralCodeExists(referralCode);
    } while (codeExists);

    // 7. Create user entity
    const user = User.create({
      email: Email.create(command.email),
      username: command.username,
      passwordHash,
      firstName: command.firstName,
      lastName: command.lastName,
      phone: command.phone,
      role: command.role,
      sponsorId: command.sponsorId,
      referralCode: ReferralCode.create(referralCode),
      status: UserStatus.ACTIVE,
      emailVerified: false,
    });

    // 8. Save user
    const savedUser = await this.userRepository.save(user);

    return savedUser;
  }
}
