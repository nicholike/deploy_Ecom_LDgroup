/**
 * Referral Code Value Object
 * Ensures referral code follows business rules
 */
export class ReferralCode {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(code: string): ReferralCode {
    if (!this.isValid(code)) {
      throw new Error('Invalid referral code format');
    }
    return new ReferralCode(code.toUpperCase().trim());
  }

  static isValid(code: string): boolean {
    // Referral code should be 6-20 alphanumeric characters
    const codeRegex = /^[A-Z0-9]{6,20}$/i;
    return codeRegex.test(code);
  }

  get value(): string {
    return this._value;
  }

  equals(code: ReferralCode): boolean {
    return this._value === code.value;
  }

  toString(): string {
    return this._value;
  }
}
