import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeSponsorDto {
  @ApiProperty({
    example: 'abc123def456',
    description: 'ID của sponsor mới (người giới thiệu mới)'
  })
  @IsNotEmpty({ message: 'New sponsor ID is required' })
  @IsString()
  newSponsorId: string;
}
