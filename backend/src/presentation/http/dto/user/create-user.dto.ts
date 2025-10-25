import { IsEmail, IsString, MinLength, MaxLength, IsEnum, IsOptional, IsUUID, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@shared/constants/user-roles.constant';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({ example: 'username123', minLength: 3 })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(50, { message: 'Username cannot exceed 50 characters' })
  @Matches(/^[a-zA-Z0-9]([a-zA-Z0-9_-]{1,48}[a-zA-Z0-9])?$/, {
    message: 'Username can only contain letters, numbers, underscores (_) and hyphens (-). Cannot start or end with dash/underscore',
  })
  username: string;

  @ApiProperty({ example: 'Password@123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, number and special character',
  })
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.F1 })
  @IsEnum(UserRole, { message: 'Invalid user role' })
  role: UserRole;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID('4', { message: 'Invalid sponsor ID format' })
  sponsorId: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+84901234567' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?\d{9,15}$/, { message: 'Invalid phone number format' })
  phone?: string;
}
