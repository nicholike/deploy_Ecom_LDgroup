import * as crypto from 'crypto';
import { BaseEntity } from '@shared/common/base.entity';
import { Slug } from '../value-objects/slug.vo';

export interface CategoryProps {
  name: string;
  slug: Slug;
  description?: string;
  parentId?: string;
  image?: string;
  order: number;
  active: boolean;
}

export class Category extends BaseEntity {
  private props: CategoryProps;

  private constructor(id: string, props: CategoryProps, createdAt?: Date, updatedAt?: Date) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  // Factory method to create new category
  static create(props: CategoryProps, id?: string): Category {
    return new Category(id || crypto.randomUUID(), props);
  }

  // Factory method to reconstitute from database
  static fromPersistence(id: string, props: CategoryProps, createdAt: Date, updatedAt: Date): Category {
    return new Category(id, props, createdAt, updatedAt);
  }

  // Getters
  get name(): string {
    return this.props.name;
  }

  get slug(): Slug {
    return this.props.slug;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get parentId(): string | undefined {
    return this.props.parentId;
  }

  get image(): string | undefined {
    return this.props.image;
  }

  get order(): number {
    return this.props.order;
  }

  get active(): boolean {
    return this.props.active;
  }

  // Business methods
  updateBasicInfo(data: { name?: string; description?: string; image?: string }): void {
    if (data.name !== undefined) {
      this.props.name = data.name;
      // Auto-update slug when name changes
      this.props.slug = Slug.create(data.name);
    }
    if (data.description !== undefined) this.props.description = data.description;
    if (data.image !== undefined) this.props.image = data.image;
    this.updatedAt = new Date();
  }

  changeParent(parentId?: string): void {
    // TODO: Add validation to prevent circular references
    this.props.parentId = parentId;
    this.updatedAt = new Date();
  }

  updateOrder(order: number): void {
    if (order < 0) {
      throw new Error('Order cannot be negative');
    }
    this.props.order = order;
    this.updatedAt = new Date();
  }

  activate(): void {
    this.props.active = true;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.active = false;
    this.updatedAt = new Date();
  }

  isRoot(): boolean {
    return !this.props.parentId;
  }

  isActive(): boolean {
    return this.props.active;
  }

  // Convert to plain object for persistence
  toPersistence(): any {
    return {
      id: this.id,
      name: this.props.name,
      slug: this.props.slug.value,
      description: this.props.description,
      parentId: this.props.parentId,
      image: this.props.image,
      order: this.props.order,
      active: this.props.active,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
