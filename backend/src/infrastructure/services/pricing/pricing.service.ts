import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  GlobalPriceConfig,
  parsePriceConfig,
  DEFAULT_PRICE_CONFIG,
  calculateRangePrice,
  PriceBreakdown
} from '@shared/utils/global-pricing.util';

/**
 * PRICING SERVICE
 *
 * Quản lý logic tính giá global cho sản phẩm
 * - Lấy cấu hình giá từ SystemSetting
 * - Tính giá theo khoảng số lượng (1-9, 10-99, 100+)
 * - Tính theo TỔNG số lượng của tất cả sản phẩm cùng dung tích
 * - Cache config để tránh query DB liên tục
 */
@Injectable()
export class PricingService {
  private priceConfigCache: GlobalPriceConfig | null = null;
  private lastCacheTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy cấu hình giá global từ SystemSetting (có cache)
   */
  async getPriceConfig(): Promise<GlobalPriceConfig> {
    const now = Date.now();

    // Return cached config if still valid
    if (this.priceConfigCache && (now - this.lastCacheTime) < this.CACHE_TTL) {
      return this.priceConfigCache;
    }

    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'global_product_pricing' }
      });

      if (setting && setting.value) {
        this.priceConfigCache = parsePriceConfig(setting.value);
        this.lastCacheTime = now;
        return this.priceConfigCache;
      }
    } catch (error) {
      console.error('Failed to load price config from DB:', error);
    }

    // Fallback to default config
    console.warn('Using default price config');
    this.priceConfigCache = DEFAULT_PRICE_CONFIG;
    this.lastCacheTime = now;
    return DEFAULT_PRICE_CONFIG;
  }

  /**
   * Invalidate cache (gọi khi admin update giá)
   */
  clearCache(): void {
    this.priceConfigCache = null;
    this.lastCacheTime = 0;
  }

  /**
   * Tính giá cho tất cả items theo dung tích
   * Logic mới: Group items theo size, tính tổng số lượng, áp dụng giá theo khoảng
   */
  async calculatePriceForItems(items: Array<{ quantity: number; size: '5ml' | '20ml' }>): Promise<{
    priceBreakdownBySize: Map<'5ml' | '20ml', PriceBreakdown>;
    totalPrice: number;
  }> {
    const config = await this.getPriceConfig();

    // Group items by size and calculate total quantity per size
    const quantityBySize = new Map<'5ml' | '20ml', number>();

    for (const item of items) {
      const currentQty = quantityBySize.get(item.size) || 0;
      quantityBySize.set(item.size, currentQty + item.quantity);
    }

    // Calculate price for each size based on total quantity
    const priceBreakdownBySize = new Map<'5ml' | '20ml', PriceBreakdown>();
    let totalPrice = 0;

    for (const [size, totalQuantity] of quantityBySize) {
      const breakdown = calculateRangePrice(totalQuantity, size, config);
      priceBreakdownBySize.set(size, breakdown);
      totalPrice += breakdown.totalPrice;
    }

    return {
      priceBreakdownBySize,
      totalPrice
    };
  }

  /**
   * DEPRECATED: Use calculatePriceForItems for cart calculations
   * Kept for backward compatibility only
   */
  async calculatePrice(
    quantity: number,
    size: '5ml' | '20ml'
  ): Promise<PriceBreakdown> {
    const config = await this.getPriceConfig();
    return calculateRangePrice(quantity, size, config);
  }
}
