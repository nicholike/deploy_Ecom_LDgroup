import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive, IsUUID } from 'class-validator';
import { UserRole, UserStatus } from '@shared/constants/user-roles.constant';

export class GetUserTreeDto {
  @ApiPropertyOptional({
    description:
      'Root user ID to build the MLM tree from. If omitted, all root users are returned.',
  })
  @IsOptional()
  @IsUUID()
  rootId?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    description: 'Optional role filter applied to the nodes included in the tree.',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    enum: UserStatus,
    description: 'Optional status filter applied to the nodes included in the tree.',
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    minimum: 1,
    description: 'Limit the depth of descendants in the returned tree (root level is 1).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  maxDepth?: number;
}
