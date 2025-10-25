import { IsEmail, IsString, MinLength, MaxLength, IsNotEmpty, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email là bắt buộc' })
  email: string;

  @ApiProperty({ example: 'john_doe' })
  @IsString()
  @MinLength(3, { message: 'Username phải có ít nhất 3 ký tự' })
  @MaxLength(50, { message: 'Username không được vượt quá 50 ký tự' })
  @Matches(/^[a-zA-Z0-9]([a-zA-Z0-9_-]{1,48}[a-zA-Z0-9])?$/, {
    message: 'Username chỉ được chứa chữ cái, số, dấu gạch dưới (_) và dấu gạch ngang (-). Không được bắt đầu hoặc kết thúc bằng dấu gạch',
  })
  @IsNotEmpty({ message: 'Username là bắt buộc' })
  username: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt',
  })
  @IsNotEmpty({ message: 'Mật khẩu là bắt buộc' })
  password: string;

  @ApiProperty({ example: 'ABC123', description: 'Mã giới thiệu từ người giới thiệu (bắt buộc)' })
  @IsString()
  @MinLength(6, { message: 'Mã giới thiệu phải có ít nhất 6 ký tự' })
  @MaxLength(20, { message: 'Mã giới thiệu không được vượt quá 20 ký tự' })
  @IsNotEmpty({ message: 'Mã giới thiệu là bắt buộc' })
  referralCode: string;

  @ApiProperty({ example: 'John', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiProperty({ example: '0987654321', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10,11}$/, { message: 'Số điện thoại không hợp lệ' })
  phone?: string;
}
