import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  ICategoryRepository,
  CategoryFilters,
  CategoryListResult,
  CategoryWithChildren,
} from '@core/domain/product/interfaces/category.repository.interface';
import { Category } from '@core/domain/product/entities/category.entity';
import { Slug } from '@core/domain/product/value-objects/slug.vo';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(category: Category): Promise<Category> {
    const data = category.toPersistence();
    const created = await this.prisma.category.create({
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        parentId: data.parentId,
        image: data.image,
        order: data.order,
        active: data.active,
      },
    });
    return this.toDomain(created);
  }

  async findById(id: string): Promise<Category | null> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    return category ? this.toDomain(category) : null;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const category = await this.prisma.category.findUnique({
      where: { slug },
    });
    return category ? this.toDomain(category) : null;
  }

  async findAll(page: number, limit: number, filters?: CategoryFilters): Promise<CategoryListResult> {
    const skip = (page - 1) * limit;

    const where: Prisma.CategoryWhereInput = {};

    if (filters) {
      if (filters.parentId !== undefined) {
        where.parentId = filters.parentId;
      }
      if (filters.active !== undefined) {
        where.active = filters.active;
      }
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search } },
          { description: { contains: filters.search } },
        ];
      }
    }

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { order: 'asc' },
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      data: categories.map((c) => this.toDomain(c)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByParentId(parentId: string | null): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({
      where: { parentId },
      orderBy: { order: 'asc' },
    });
    return categories.map((c) => this.toDomain(c));
  }

  async findTree(): Promise<CategoryWithChildren[]> {
    // Get all categories
    const allCategories = await this.prisma.category.findMany({
      orderBy: { order: 'asc' },
    });

    // Convert to domain
    const domainCategories = allCategories.map((c) => this.toDomain(c));

    // Build tree structure
    const categoryMap = new Map<string, any>();
    const rootCategories: any[] = [];

    // First pass: create map
    domainCategories.forEach((cat) => {
      const catWithChildren = Object.assign(Object.create(Object.getPrototypeOf(cat)), cat);
      catWithChildren.children = [];
      categoryMap.set(cat.id, catWithChildren);
    });

    // Second pass: build tree
    domainCategories.forEach((cat) => {
      const categoryWithChildren = categoryMap.get(cat.id)!;
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(categoryWithChildren);
        }
      } else {
        rootCategories.push(categoryWithChildren);
      }
    });

    return rootCategories;
  }

  async update(category: Category): Promise<Category> {
    const data = category.toPersistence();
    const updated = await this.prisma.category.update({
      where: { id: data.id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        parentId: data.parentId,
        image: data.image,
        order: data.order,
        active: data.active,
        updatedAt: data.updatedAt,
      },
    });
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.category.delete({
      where: { id },
    });
  }

  async hasProducts(id: string): Promise<boolean> {
    const count = await this.prisma.product.count({
      where: { categoryId: id },
    });
    return count > 0;
  }

  async hasChildren(id: string): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: { parentId: id },
    });
    return count > 0;
  }

  async findRootCategories(): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({
      where: { parentId: null },
      orderBy: { order: 'asc' },
    });
    return categories.map((c) => this.toDomain(c));
  }

  async findActiveCategories(): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    });
    return categories.map((c) => this.toDomain(c));
  }

  // Helper method to convert Prisma model to Domain entity
  private toDomain(prismaCategory: any): Category {
    return Category.fromPersistence(
      prismaCategory.id,
      {
        name: prismaCategory.name,
        slug: Slug.fromString(prismaCategory.slug),
        description: prismaCategory.description,
        parentId: prismaCategory.parentId,
        image: prismaCategory.image,
        order: prismaCategory.order,
        active: prismaCategory.active,
      },
      new Date(prismaCategory.createdAt),
      new Date(prismaCategory.updatedAt),
    );
  }
}
