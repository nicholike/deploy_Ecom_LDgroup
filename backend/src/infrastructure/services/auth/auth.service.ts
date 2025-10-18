import {
  Injectable,
  Inject,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IUserRepository } from '@core/domain/user/interfaces/user.repository.interface';
import * as bcrypt from 'bcrypt';
import { IPasswordResetTokenRepository } from '@core/domain/auth/interfaces/password-reset-token.repository.interface';
import { PasswordResetToken } from '@core/domain/auth/entities/password-reset-token.entity';
import { CryptoUtil } from '@shared/utils/crypto.util';
import { UserStatus } from '@shared/constants/user-roles.constant';
import { EmailService } from '../email/email.service';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    referralCode?: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IPasswordResetTokenRepository')
    private readonly passwordResetTokenRepository: IPasswordResetTokenRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async login(usernameOrEmail: string, password: string): Promise<LoginResult> {
    // 1. Find user by username or email
    const input = usernameOrEmail.toLowerCase().trim();
    let user = null;

    // Try to find by email first (if it contains @)
    if (input.includes('@')) {
      user = await this.userRepository.findByEmail(input);
    }

    // If not found, try username
    if (!user) {
      user = await this.userRepository.findByUsername(input);
    }

    if (!user) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    // 2. Check user status with specific messages
    if (user.isPending()) {
      throw new UnauthorizedException(
        'Tài khoản đang chờ phê duyệt từ quản trị viên. Vui lòng đợi thông báo qua email.'
      );
    }

    if (user.isRejected()) {
      const reason = user.rejectionReason
        ? ` Lý do: ${user.rejectionReason}`
        : '';
      throw new UnauthorizedException(
        `Tài khoản đã bị từ chối.${reason} Bạn có thể đăng ký lại với email khác.`
      );
    }

    // Check specific status for better error messages
    if (user.status === UserStatus.BANNED) {
      const reason = user.lockedReason ? ` Lý do: ${user.lockedReason}` : '';
      throw new UnauthorizedException(
        `Tài khoản của bạn đã bị cấm vĩnh viễn.${reason} Vui lòng liên hệ quản trị viên để biết thêm chi tiết.`
      );
    }

    if (user.status === UserStatus.SUSPENDED) {
      const reason = user.lockedReason ? ` Lý do: ${user.lockedReason}` : '';
      throw new UnauthorizedException(
        `Tài khoản của bạn đã bị tạm ngưng.${reason} Vui lòng liên hệ quản trị viên để được mở lại.`
      );
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException(
        'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên để kích hoạt lại.'
      );
    }

    if (!user.isActive()) {
      throw new UnauthorizedException('Tài khoản không thể đăng nhập. Vui lòng liên hệ quản trị viên.');
    }

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // 4. Update last login
    user.updateLastLogin();
    await this.userRepository.save(user);

    // 5. Generate tokens
    const payload = {
      sub: user.id,
      email: user.email.value,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email.value,
        username: user.username,
        role: user.role,
        referralCode: user.referralCode.value,
      },
    };
  }

  async validateUser(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.isActive()) {
      throw new UnauthorizedException('Không tìm thấy người dùng hoặc tài khoản đã bị vô hiệu hóa');
    }
    return user;
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const user = await this.validateUser(payload.sub);

      const newPayload = {
        sub: user.id,
        email: user.email.value,
        role: user.role,
      };

      return {
        accessToken: this.jwtService.sign(newPayload),
        refreshToken: this.jwtService.sign(newPayload, {
          secret: this.configService.get<string>('jwt.refreshSecret'),
          expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
        }),
      };
    } catch (error) {
      throw new UnauthorizedException('Token làm mới không hợp lệ');
    }
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = email.toLowerCase();
    const user = await this.userRepository.findByEmail(normalizedEmail);

    const response: { message: string; resetToken?: string } = {
      message: 'Nếu tồn tại tài khoản với email này, hướng dẫn đặt lại mật khẩu đã được gửi.',
    };

    if (!user || !user.isActive()) {
      return response;
    }

    const token = CryptoUtil.generateRandomString(32);
    const tokenHash = CryptoUtil.hash(token);

    await this.invalidateAllTokensSafe(user.id);
    await this.deleteExpiredTokensSafe();

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    const resetToken = PasswordResetToken.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    await this.passwordResetTokenRepository.create(resetToken);

    // Send email with reset link
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    // 🔧 FIX: Check return value instead of try/catch
    // sendPasswordResetEmail() returns boolean (true if sent, false if failed)
    const emailSent = await this.emailService.sendPasswordResetEmail(
      user.email.value,
      resetUrl,
      user.username,
    );

    if (emailSent) {
      this.logger.log(`✅ Password reset email sent to ${user.email.value}`);
    } else {
      this.logger.warn(
        `⚠️ Failed to send password reset email to ${user.email.value} ` +
        `(SMTP blocked on Railway). User can still reset via token if available in dev mode.`
      );
      // Token is still valid - user can reset password if they have the token
    }

    // For development, include token in response
    if (process.env.NODE_ENV !== 'production') {
      response.resetToken = token;
    }

    return response;
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = CryptoUtil.hash(token);
    const resetRecord = await this.passwordResetTokenRepository.findValidByTokenHash(tokenHash);

    if (!resetRecord) {
      throw new UnauthorizedException('Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    }

    const user = await this.userRepository.findById(resetRecord.userId);
    if (!user || !user.isActive()) {
      throw new UnauthorizedException('Mã đặt lại mật khẩu không hợp lệ');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.changePassword(passwordHash);
    await this.userRepository.save(user);

    resetRecord.markUsed();
    await this.passwordResetTokenRepository.markAsUsed(resetRecord.id);
    await this.invalidateAllTokensSafe(user.id);

    return { message: 'Mật khẩu đã được đặt lại thành công' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (currentPassword === newPassword) {
      throw new BadRequestException('Mật khẩu mới phải khác với mật khẩu hiện tại');
    }

    const user = await this.userRepository.findById(userId);
    if (!user || !user.isActive()) {
      throw new UnauthorizedException('Không tìm thấy người dùng hoặc tài khoản đã bị vô hiệu hóa');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.changePassword(passwordHash);
    await this.userRepository.save(user);

    await this.invalidateAllTokensSafe(user.id);

    return { message: 'Mật khẩu đã được cập nhật thành công' };
  }

  private async invalidateAllTokensSafe(userId: string): Promise<void> {
    try {
      await this.passwordResetTokenRepository.invalidateAllForUser(userId);
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate password reset tokens for user ${userId}: ${this.extractErrorMessage(error)}`,
      );
    }
  }

  private async deleteExpiredTokensSafe(): Promise<void> {
    try {
      await this.passwordResetTokenRepository.deleteExpired();
    } catch (error) {
      this.logger.warn(`Failed to prune expired password reset tokens: ${this.extractErrorMessage(error)}`);
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String((error as any).message);
    }
    return JSON.stringify(error);
  }
}
