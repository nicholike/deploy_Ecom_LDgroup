import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Category } from '@core/domain/product/entities/category.entity';

export class CategoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  parentId?: string;

  @ApiPropertyOptional()
  image?: string;

  @ApiProperty()
  order: number;

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Computed fields
  @ApiProperty()
  isRoot: boolean;

  static fromDomain(category: Category): CategoryResponseDto {
    const dto = new CategoryResponseDto();
    dto.id = category.id;
    dto.name = category.name;
    dto.slug = category.slug.value;
    dto.description = category.description;
    dto.parentId = category.parentId;
    dto.image = category.image;
    dto.order = category.order;
    dto.active = category.active;
    dto.createdAt = category.createdAt!;
    dto.updatedAt = category.updatedAt!;
    dto.isRoot = category.isRoot();
    return dto;
  }
}

export class CategoryTreeResponseDto extends CategoryResponseDto {
  @ApiPropertyOptional({ type: [CategoryTreeResponseDto] })
  children?: CategoryTreeResponseDto[];

  static fromDomainWithChildren(category: Category, children?: CategoryTreeResponseDto[]): CategoryTreeResponseDto {
    const dto = new CategoryTreeResponseDto();
    Object.assign(dto, CategoryResponseDto.fromDomain(category));
    dto.children = children;
    return dto;
  }
}
