import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { DeleteProductCommand } from './delete-product.command';
import { IProductRepository } from '@core/domain/product/interfaces/product.repository.interface';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Injectable()
export class DeleteProductHandler {
  constructor(
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: DeleteProductCommand): Promise<void> {
    // 1. Check if product exists
    const product = await this.productRepository.findById(command.id);
    if (!product) {
      throw new NotFoundException(`Product with ID "${command.id}" not found`);
    }

    // 2. Check if product has orders
    const orderCount = await this.prisma.orderItem.count({
      where: { productId: command.id },
    });

    if (orderCount > 0) {
      throw new ConflictException(
        `Cannot delete product "${product.name}" because it has associated orders. Consider discontinuing it instead.`,
      );
    }

    // 3. Delete product
    await this.productRepository.delete(command.id);
  }
}
