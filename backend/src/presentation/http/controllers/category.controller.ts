import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateCategoryDto } from '../dto/category/create-category.dto';
import { UpdateCategoryDto } from '../dto/category/update-category.dto';
import { CategoryResponseDto, CategoryTreeResponseDto } from '../dto/category/category-response.dto';
import { ListCategoriesDto } from '../dto/category/list-categories.dto';
import { CreateCategoryCommand } from '@core/application/category/commands/create-category/create-category.command';
import { CreateCategoryHandler } from '@core/application/category/commands/create-category/create-category.handler';
import { UpdateCategoryCommand } from '@core/application/category/commands/update-category/update-category.command';
import { UpdateCategoryHandler } from '@core/application/category/commands/update-category/update-category.handler';
import { DeleteCategoryCommand } from '@core/application/category/commands/delete-category/delete-category.command';
import { DeleteCategoryHandler } from '@core/application/category/commands/delete-category/delete-category.handler';
import { GetCategoryQuery } from '@core/application/category/queries/get-category/get-category.query';
import { GetCategoryHandler } from '@core/application/category/queries/get-category/get-category.handler';
import { ListCategoriesQuery } from '@core/application/category/queries/list-categories/list-categories.query';
import { ListCategoriesHandler } from '@core/application/category/queries/list-categories/list-categories.handler';
import { GetCategoryTreeQuery } from '@core/application/category/queries/get-category-tree/get-category-tree.query';
import { GetCategoryTreeHandler } from '@core/application/category/queries/get-category-tree/get-category-tree.handler';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@shared/constants/user-roles.constant';
import { Public } from '@shared/decorators/public.decorator';
import { CategoryWithChildren } from '@core/domain/product/interfaces/category.repository.interface';

@ApiTags('Categories')
@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CategoryController {
  constructor(
    private readonly createCategoryHandler: CreateCategoryHandler,
    private readonly updateCategoryHandler: UpdateCategoryHandler,
    private readonly deleteCategoryHandler: DeleteCategoryHandler,
    private readonly getCategoryHandler: GetCategoryHandler,
    private readonly listCategoriesHandler: ListCategoriesHandler,
    private readonly getCategoryTreeHandler: GetCategoryTreeHandler,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new category (Admin only)' })
  @ApiResponse({ status: 201, type: CategoryResponseDto })
  async create(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const command = new CreateCategoryCommand(
      dto.name,
      dto.description,
      dto.parentId,
      dto.image,
      dto.order,
      dto.active,
    );

    const category = await this.createCategoryHandler.execute(command);
    return CategoryResponseDto.fromDomain(category);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all categories with filters' })
  @ApiResponse({ status: 200, type: [CategoryResponseDto] })
  async list(@Query() query: ListCategoriesDto) {
    const listQuery = new ListCategoriesQuery(
      query.page,
      query.limit,
      query.parentId === 'null' ? null : query.parentId,
      query.active,
      query.search,
    );

    const result = await this.listCategoriesHandler.execute(listQuery);

    return {
      data: result.data.map((category) => CategoryResponseDto.fromDomain(category)),
      pagination: result.pagination,
    };
  }

  @Get('tree')
  @Public()
  @ApiOperation({ summary: 'Get category tree hierarchy' })
  @ApiResponse({ status: 200, type: [CategoryTreeResponseDto] })
  async getTree(@Query('activeOnly') activeOnly?: boolean) {
    const query = new GetCategoryTreeQuery(activeOnly);
    const tree = await this.getCategoryTreeHandler.execute(query);

    const mapToDto = (node: CategoryWithChildren): CategoryTreeResponseDto => {
      const children = node.children?.map(mapToDto);
      return CategoryTreeResponseDto.fromDomainWithChildren(node as any, children);
    };

    return {
      data: tree.map(mapToDto),
    };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  async findOne(@Param('id') id: string): Promise<CategoryResponseDto> {
    const query = new GetCategoryQuery(id);
    const category = await this.getCategoryHandler.execute(query);
    return CategoryResponseDto.fromDomain(category);
  }

  @Get('by-slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get category by slug' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  async findBySlug(@Param('slug') slug: string): Promise<CategoryResponseDto> {
    const query = new GetCategoryQuery(undefined, slug);
    const category = await this.getCategoryHandler.execute(query);
    return CategoryResponseDto.fromDomain(category);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update category (Admin only)' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    const command = new UpdateCategoryCommand(
      id,
      dto.name,
      dto.description,
      dto.parentId,
      dto.image,
      dto.order,
      dto.active,
    );

    const category = await this.updateCategoryHandler.execute(command);
    return CategoryResponseDto.fromDomain(category);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete category (Admin only)' })
  @ApiResponse({ status: 204 })
  async delete(@Param('id') id: string): Promise<void> {
    const command = new DeleteCategoryCommand(id);
    await this.deleteCategoryHandler.execute(command);
  }
}
