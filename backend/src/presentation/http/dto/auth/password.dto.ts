import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@ldgroup.com' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'abcdef1234567890' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewPassword123' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;
}


export class ChangePasswordDto {
  @ApiProperty({ example: 'CurrentPassword123' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  currentPassword: string;

  @ApiProperty({ example: 'NewPassword123' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  newPassword: string;
}
