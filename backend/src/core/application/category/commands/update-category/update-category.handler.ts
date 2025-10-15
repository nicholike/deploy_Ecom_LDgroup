import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { UpdateCategoryCommand } from './update-category.command';
import { ICategoryRepository } from '@core/domain/product/interfaces/category.repository.interface';
import { Category } from '@core/domain/product/entities/category.entity';
import { Slug } from '@core/domain/product/value-objects/slug.vo';

@Injectable()
export class UpdateCategoryHandler {
  constructor(
    @Inject('ICategoryRepository')
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(command: UpdateCategoryCommand): Promise<Category> {
    // 1. Find existing category
    const category = await this.categoryRepository.findById(command.id);
    if (!category) {
      throw new NotFoundException(`Category with ID "${command.id}" not found`);
    }

    // 2. Validate slug uniqueness if name is changing
    if (command.name !== undefined && command.name !== category.name) {
      const slug = Slug.create(command.name);
      const existingSlug = await this.categoryRepository.findBySlug(slug.value);
      if (existingSlug && existingSlug.id !== command.id) {
        throw new ConflictException(`Category with slug "${slug.value}" already exists`);
      }
    }

    // 3. Validate parent category if provided
    if (command.parentId !== undefined && command.parentId !== null) {
      // Prevent setting self as parent
      if (command.parentId === command.id) {
        throw new ConflictException('Category cannot be its own parent');
      }

      const parentCategory = await this.categoryRepository.findById(command.parentId);
      if (!parentCategory) {
        throw new NotFoundException(`Parent category with ID "${command.parentId}" not found`);
      }
      if (!parentCategory.isActive()) {
        throw new ConflictException(`Parent category "${parentCategory.name}" is not active`);
      }

      // Prevent circular reference by checking if new parent is a descendant
      await this.validateNoCircularReference(command.id, command.parentId);
    }

    // 4. Update basic info
    if (command.name !== undefined || command.description !== undefined || command.image !== undefined) {
      category.updateBasicInfo({
        name: command.name,
        description: command.description,
        image: command.image,
      });
    }

    // 5. Update parent
    if (command.parentId !== undefined) {
      category.changeParent(command.parentId || undefined);
    }

    // 6. Update order
    if (command.order !== undefined) {
      category.updateOrder(command.order);
    }

    // 7. Update active status
    if (command.active !== undefined) {
      if (command.active) {
        category.activate();
      } else {
        category.deactivate();
      }
    }

    // 8. Persist changes
    return await this.categoryRepository.update(category);
  }

  private async validateNoCircularReference(categoryId: string, newParentId: string): Promise<void> {
    let currentId: string | undefined = newParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) {
        throw new ConflictException('Circular reference detected in category hierarchy');
      }
      visited.add(currentId);

      if (currentId === categoryId) {
        throw new ConflictException('Cannot set a descendant category as parent (circular reference)');
      }

      const parent = await this.categoryRepository.findById(currentId);
      currentId = parent?.parentId;
    }
  }
}
