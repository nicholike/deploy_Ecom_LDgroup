export class Price {
  private readonly _amount: number;

  private constructor(amount: number) {
    this._amount = amount;
  }

  static create(amount: number): Price {
    if (amount < 0) {
      throw new Error('Price cannot be negative');
    }

    if (amount > 999999999.99) {
      throw new Error('Price exceeds maximum allowed value');
    }

    // Round to 2 decimal places
    const rounded = Math.round(amount * 100) / 100;

    return new Price(rounded);
  }

  get amount(): number {
    return this._amount;
  }

  add(other: Price): Price {
    return Price.create(this._amount + other._amount);
  }

  subtract(other: Price): Price {
    return Price.create(this._amount - other._amount);
  }

  multiply(factor: number): Price {
    return Price.create(this._amount * factor);
  }

  isGreaterThan(other: Price): boolean {
    return this._amount > other._amount;
  }

  isLessThan(other: Price): boolean {
    return this._amount < other._amount;
  }

  equals(other: Price): boolean {
    return this._amount === other._amount;
  }

  toString(): string {
    return this._amount.toFixed(2);
  }
}
