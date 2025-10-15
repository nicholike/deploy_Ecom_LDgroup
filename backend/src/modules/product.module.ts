import { Module } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ProductRepository } from '@infrastructure/database/repositories/product.repository';
import { ProductVariantRepository } from '@infrastructure/database/repositories/product-variant.repository';
import { CategoryRepository } from '@infrastructure/database/repositories/category.repository';
import { PriceTierRepository } from '@infrastructure/database/repositories/price-tier.repository';
import { ProductController } from '@presentation/http/controllers/product.controller';
import { CreateProductHandler } from '@core/application/product/commands/create-product/create-product.handler';
import { UpdateProductHandler } from '@core/application/product/commands/update-product/update-product.handler';
import { DeleteProductHandler } from '@core/application/product/commands/delete-product/delete-product.handler';
import { GetProductHandler } from '@core/application/product/queries/get-product/get-product.handler';
import { ListProductsHandler } from '@core/application/product/queries/list-products/list-products.handler';

@Module({
  controllers: [ProductController],
  providers: [
    PrismaService,
    // Repositories
    {
      provide: 'IProductRepository',
      useClass: ProductRepository,
    },
    {
      provide: 'IProductVariantRepository',
      useClass: ProductVariantRepository,
    },
    {
      provide: 'ICategoryRepository',
      useClass: CategoryRepository,
    },
    PriceTierRepository,
    // Command Handlers
    CreateProductHandler,
    UpdateProductHandler,
    DeleteProductHandler,
    // Query Handlers
    GetProductHandler,
    ListProductsHandler,
  ],
  exports: [
    'IProductRepository',
    'IProductVariantRepository',
    CreateProductHandler,
    UpdateProductHandler,
    DeleteProductHandler,
    GetProductHandler,
    ListProductsHandler,
  ],
})
export class ProductModule {}
