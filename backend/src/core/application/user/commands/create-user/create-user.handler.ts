import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
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
    // 1. Validate sponsor exists
    // Note: Sponsor is the referrer in MLM hierarchy, not necessarily the creator
    // Only ADMIN can create users (enforced by controller guard)
    let sponsorId: string | undefined = command.sponsorId;

    if (command.role === 'ADMIN') {
      // For ADMIN accounts, find the root admin (first admin created)
      // New admins will be under the root admin in MLM tree
      const rootAdmin = await this.userRepository.findRootAdmin();

      if (rootAdmin) {
        // If root admin exists, new admin becomes child of root admin
        sponsorId = rootAdmin.id;
      } else {
        // This is the first admin (root admin), no sponsor needed
        sponsorId = undefined;
      }
    } else {
      const sponsor = await this.userRepository.findById(command.sponsorId);
      if (!sponsor) {
        throw new NotFoundException('Sponsor not found');
      }
    }

    // No need to check sponsor's permission to create role
    // because only ADMIN (who is creating) has permission to create all roles

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
      const phoneExists = await this.userRepository.phoneExists(command.phone);
      if (phoneExists) {
        throw new ConflictException('Phone number already exists');
      }
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
      sponsorId: sponsorId, // undefined for ADMIN
      referralCode: ReferralCode.create(referralCode),
      status: UserStatus.ACTIVE,
      emailVerified: false,
      quotaLimit: 300,
      quotaUsed: 0,
    });

    // 8. Save user
    const savedUser = await this.userRepository.save(user);

    // Note: Wallet will be auto-created when needed (e.g., when user receives first commission)
    // ADMIN users don't need wallets as they don't earn commissions

    return savedUser;
  }
}
