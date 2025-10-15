import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class UserTreeNodeDto {
  @ApiProperty({ type: () => UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ type: () => [UserTreeNodeDto] })
  children: UserTreeNodeDto[];

  static from(userDto: UserResponseDto, children: UserTreeNodeDto[] = []): UserTreeNodeDto {
    return {
      user: userDto,
      children,
    };
  }
}
