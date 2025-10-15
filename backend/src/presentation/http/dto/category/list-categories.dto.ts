import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListCategoriesDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'uuid-parent-id', description: 'Filter by parent ID, use "null" for root categories' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: 'perfume' })
  @IsOptional()
  @IsString()
  search?: string;
}
