import * as crypto from 'crypto';

export class CryptoUtil {
  /**
   * Generate a random string
   */
  static generateRandomString(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate referral code
   */
  static generateReferralCode(prefix: string = ''): string {
    const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
    return prefix ? `${prefix}${randomPart}` : randomPart;
  }

  /**
   * Generate unique order number
   */
  static generateOrderNumber(prefix: string = 'ORD'): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Hash data (for non-password data)
   */
  static hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify hash
   */
  static verifyHash(data: string, hash: string): boolean {
    return this.hash(data) === hash;
  }
}
