import { Module } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CategoryRepository } from '@infrastructure/database/repositories/category.repository';
import { CategoryController } from '@presentation/http/controllers/category.controller';
import { CreateCategoryHandler } from '@core/application/category/commands/create-category/create-category.handler';
import { UpdateCategoryHandler } from '@core/application/category/commands/update-category/update-category.handler';
import { DeleteCategoryHandler } from '@core/application/category/commands/delete-category/delete-category.handler';
import { GetCategoryHandler } from '@core/application/category/queries/get-category/get-category.handler';
import { ListCategoriesHandler } from '@core/application/category/queries/list-categories/list-categories.handler';
import { GetCategoryTreeHandler } from '@core/application/category/queries/get-category-tree/get-category-tree.handler';

@Module({
  controllers: [CategoryController],
  providers: [
    PrismaService,
    // Repositories
    {
      provide: 'ICategoryRepository',
      useClass: CategoryRepository,
    },
    // Command Handlers
    CreateCategoryHandler,
    UpdateCategoryHandler,
    DeleteCategoryHandler,
    // Query Handlers
    GetCategoryHandler,
    ListCategoriesHandler,
    GetCategoryTreeHandler,
  ],
  exports: [
    'ICategoryRepository',
    CreateCategoryHandler,
    UpdateCategoryHandler,
    DeleteCategoryHandler,
    GetCategoryHandler,
    ListCategoriesHandler,
    GetCategoryTreeHandler,
  ],
})
export class CategoryModule {}
