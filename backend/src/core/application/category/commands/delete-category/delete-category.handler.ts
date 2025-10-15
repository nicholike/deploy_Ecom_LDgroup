import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { DeleteCategoryCommand } from './delete-category.command';
import { ICategoryRepository } from '@core/domain/product/interfaces/category.repository.interface';

@Injectable()
export class DeleteCategoryHandler {
  constructor(
    @Inject('ICategoryRepository')
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(command: DeleteCategoryCommand): Promise<void> {
    // 1. Check if category exists
    const category = await this.categoryRepository.findById(command.id);
    if (!category) {
      throw new NotFoundException(`Category with ID "${command.id}" not found`);
    }

    // 2. Check if category has children
    const hasChildren = await this.categoryRepository.hasChildren(command.id);
    if (hasChildren) {
      throw new ConflictException(
        `Cannot delete category "${category.name}" because it has child categories. Please delete or move the children first.`,
      );
    }

    // 3. Check if category has products
    const hasProducts = await this.categoryRepository.hasProducts(command.id);
    if (hasProducts) {
      throw new ConflictException(
        `Cannot delete category "${category.name}" because it has associated products. Please reassign or delete the products first.`,
      );
    }

    // 4. Delete category
    await this.categoryRepository.delete(command.id);
  }
}
