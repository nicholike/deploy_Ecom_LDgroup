import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { GetCategoryQuery } from './get-category.query';
import { ICategoryRepository } from '@core/domain/product/interfaces/category.repository.interface';
import { Category } from '@core/domain/product/entities/category.entity';

@Injectable()
export class GetCategoryHandler {
  constructor(
    @Inject('ICategoryRepository')
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(query: GetCategoryQuery): Promise<Category> {
    let category: Category | null = null;

    if (query.id) {
      category = await this.categoryRepository.findById(query.id);
    } else if (query.slug) {
      category = await this.categoryRepository.findBySlug(query.slug);
    }

    if (!category) {
      const identifier = query.id || query.slug;
      throw new NotFoundException(`Category with identifier "${identifier}" not found`);
    }

    return category;
  }
}
