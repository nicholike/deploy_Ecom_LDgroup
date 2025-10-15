import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateCategoryCommand } from './create-category.command';
import { ICategoryRepository } from '@core/domain/product/interfaces/category.repository.interface';
import { Category } from '@core/domain/product/entities/category.entity';
import { Slug } from '@core/domain/product/value-objects/slug.vo';

@Injectable()
export class CreateCategoryHandler {
  constructor(
    @Inject('ICategoryRepository')
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(command: CreateCategoryCommand): Promise<Category> {
    // 1. Generate and validate slug uniqueness
    const slug = Slug.create(command.name);
    const existingSlug = await this.categoryRepository.findBySlug(slug.value);
    if (existingSlug) {
      throw new ConflictException(`Category with slug "${slug.value}" already exists`);
    }

    // 2. Validate parent category if provided
    if (command.parentId) {
      const parentCategory = await this.categoryRepository.findById(command.parentId);
      if (!parentCategory) {
        throw new NotFoundException(`Parent category with ID "${command.parentId}" not found`);
      }
      if (!parentCategory.isActive()) {
        throw new ConflictException(`Parent category "${parentCategory.name}" is not active`);
      }
    }

    // 3. Create category entity
    const category = Category.create({
      name: command.name,
      slug,
      description: command.description,
      parentId: command.parentId,
      image: command.image,
      order: command.order ?? 0,
      active: command.active ?? true,
    });

    // 4. Persist to database
    return await this.categoryRepository.save(category);
  }
}
