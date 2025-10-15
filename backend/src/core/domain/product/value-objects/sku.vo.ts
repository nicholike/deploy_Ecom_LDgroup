export class SKU {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): SKU {
    const normalized = value.trim().toUpperCase();

    if (!normalized || normalized.length === 0) {
      throw new Error('SKU cannot be empty');
    }

    if (normalized.length < 3) {
      throw new Error('SKU must be at least 3 characters');
    }

    if (normalized.length > 50) {
      throw new Error('SKU cannot exceed 50 characters');
    }

    // SKU can contain letters, numbers, hyphens, underscores
    if (!/^[A-Z0-9_-]+$/.test(normalized)) {
      throw new Error('SKU can only contain letters, numbers, hyphens, and underscores');
    }

    return new SKU(normalized);
  }

  get value(): string {
    return this._value;
  }

  equals(other: SKU): boolean {
    return this._value === other._value;
  }
}
