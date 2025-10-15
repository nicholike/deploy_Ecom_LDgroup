import { Injectable, Inject } from '@nestjs/common';
import { GetCategoryTreeQuery } from './get-category-tree.query';
import {
  ICategoryRepository,
  CategoryWithChildren,
} from '@core/domain/product/interfaces/category.repository.interface';

@Injectable()
export class GetCategoryTreeHandler {
  constructor(
    @Inject('ICategoryRepository')
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(query: GetCategoryTreeQuery): Promise<CategoryWithChildren[]> {
    const tree = await this.categoryRepository.findTree();

    // Filter to active only if requested
    if (query.activeOnly) {
      return this.filterActiveCategories(tree);
    }

    return tree;
  }

  private filterActiveCategories(categories: CategoryWithChildren[]): CategoryWithChildren[] {
    const filtered: any[] = [];

    for (const category of categories) {
      if (category.isActive()) {
        const catWithChildren = Object.assign(Object.create(Object.getPrototypeOf(category)), category);
        catWithChildren.children = category.children ? this.filterActiveCategories(category.children) : undefined;
        filtered.push(catWithChildren);
      }
    }

    return filtered;
  }
}
