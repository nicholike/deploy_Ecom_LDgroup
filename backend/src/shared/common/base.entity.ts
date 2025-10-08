/**
 * Base Entity class
 * All domain entities should extend this
 */
export abstract class BaseEntity {
  public readonly id: string;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(id: string, createdAt?: Date, updatedAt?: Date) {
    this.id = id;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  public equals(entity?: BaseEntity): boolean {
    if (!entity) return false;
    if (!(entity instanceof this.constructor)) return false;
    return this.id === entity.id;
  }
}
