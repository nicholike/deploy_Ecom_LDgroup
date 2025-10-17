import { Controller, Post, Body, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto, RefreshTokenDto } from '../dto/user/login.dto';
import { UserResponseDto } from '../dto/user/user-response.dto';
import { ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from '../dto/auth/password.dto';
import { RegisterDto } from '../dto/auth/register.dto';
import { AuthService } from '@infrastructure/services/auth/auth.service';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { Public } from '@shared/decorators/public.decorator';
import { IUserRepository } from '@core/domain/user/interfaces/user.repository.interface';
import { Inject } from '@nestjs/common';
import { RegisterUserHandler } from '@core/application/user/commands/register-user/register-user.handler';
import { RegisterUserCommand } from '@core/application/user/commands/register-user/register-user.command';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly registerUserHandler: RegisterUserHandler,
  ) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Public user registration (requires referral code)' })
  @ApiResponse({ status: 201, description: 'Registration successful - waiting for admin approval' })
  async register(@Body() dto: RegisterDto) {
    const command = new RegisterUserCommand(
      dto.email,
      dto.username,
      dto.password,
      dto.referralCode,
      dto.firstName,
      dto.lastName,
      dto.phone,
    );

    const user = await this.registerUserHandler.execute(command);

    return {
      message: 'Đăng ký thành công! Tài khoản của bạn đang chờ phê duyệt từ quản trị viên.',
      user: UserResponseDto.fromDomain(user),
    };
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login with username or email' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.usernameOrEmail, dto.password);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset instructions sent' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async getProfile(@CurrentUser('userId') userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(userId);
    return UserResponseDto.fromDomain(user!);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password for authenticated user' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  async changePassword(@CurrentUser('userId') userId: string, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 204 })
  async logout() {
    // In stateless JWT, logout is handled client-side by removing the token
    // For token blacklisting, implement Redis-based solution
    return { message: 'Đăng xuất thành công' };
  }
}
