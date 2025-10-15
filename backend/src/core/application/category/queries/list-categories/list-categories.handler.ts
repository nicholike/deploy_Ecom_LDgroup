import { Injectable, Inject } from '@nestjs/common';
import { ListCategoriesQuery } from './list-categories.query';
import {
  ICategoryRepository,
  CategoryListResult,
} from '@core/domain/product/interfaces/category.repository.interface';

@Injectable()
export class ListCategoriesHandler {
  constructor(
    @Inject('ICategoryRepository')
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(query: ListCategoriesQuery): Promise<CategoryListResult> {
    return await this.categoryRepository.findAll(query.page, query.limit, {
      parentId: query.parentId,
      active: query.active,
      search: query.search,
    });
  }
}
