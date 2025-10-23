/**
 * GLOBAL PRICING UTILITY
 *
 * Tính giá sản phẩm theo logic khoảng số lượng:
 * - 1-9 chai: giá cao nhất
 * - 10-49 chai: giá trung bình cao
 * - 50-99 chai: giá trung bình thấp
 * - 100+ chai: giá thấp nhất
 * - Áp dụng cho 5ml và 20ml
 * - Tính theo TỔNG số lượng của tất cả sản phẩm cùng dung tích
 * - Sản phẩm đặc biệt không dùng logic này
 */

export interface PriceSettings {
  range1to9: number;       // Giá cho khoảng 1-9 chai
  range10to49: number;     // Giá cho khoảng 10-49 chai
  range50to99: number;     // Giá cho khoảng 50-99 chai
  range100plus: number;    // Giá cho khoảng 100+ chai
}

export interface GlobalPriceConfig {
  '5ml': PriceSettings;
  '20ml': PriceSettings;
}

export interface PriceBreakdown {
  pricePerUnit: number;    // Giá đơn vị áp dụng
  totalQuantity: number;   // Tổng số lượng
  totalPrice: number;      // Tổng tiền
  size: '5ml' | '20ml';    // Dung tích
  appliedRange: '1-9' | '10-49' | '50-99' | '100+'; // Khoảng giá được áp dụng
}

/**
 * Tính giá theo khoảng số lượng
 * @param quantity - Tổng số lượng sản phẩm (tính theo tổng của tất cả sản phẩm cùng dung tích)
 * @param size - Dung tích ('5ml' hoặc '20ml')
 * @param priceConfig - Cấu hình giá global
 * @returns Chi tiết giá áp dụng
 */
export function calculateRangePrice(
  quantity: number,
  size: '5ml' | '20ml',
  priceConfig: GlobalPriceConfig
): PriceBreakdown {
  const settings = priceConfig[size];

  if (!settings) {
    throw new Error(`Invalid size: ${size}`);
  }

  if (quantity <= 0) {
    return {
      pricePerUnit: settings.range1to9,
      totalQuantity: 0,
      totalPrice: 0,
      size,
      appliedRange: '1-9'
    };
  }

  // Xác định khoảng giá dựa trên tổng số lượng
  let pricePerUnit: number;
  let appliedRange: '1-9' | '10-49' | '50-99' | '100+';

  if (quantity >= 100) {
    pricePerUnit = settings.range100plus;
    appliedRange = '100+';
  } else if (quantity >= 50) {
    pricePerUnit = settings.range50to99;
    appliedRange = '50-99';
  } else if (quantity >= 10) {
    pricePerUnit = settings.range10to49;
    appliedRange = '10-49';
  } else {
    pricePerUnit = settings.range1to9;
    appliedRange = '1-9';
  }

  const totalPrice = quantity * pricePerUnit;

  return {
    pricePerUnit,
    totalQuantity: quantity,
    totalPrice,
    size,
    appliedRange
  };
}

/**
 * DEPRECATED: Use calculateRangePrice instead
 * Kept for backward compatibility
 */
export function calculateTieredPrice(
  quantity: number,
  size: '5ml' | '20ml',
  priceConfig: GlobalPriceConfig
): PriceBreakdown {
  return calculateRangePrice(quantity, size, priceConfig);
}

/**
 * Parse price config từ SystemSetting JSON
 */
export function parsePriceConfig(jsonString: string): GlobalPriceConfig {
  try {
    const config = JSON.parse(jsonString);

    // Validate structure
    if (!config['5ml'] || !config['20ml']) {
      throw new Error('Missing 5ml or 20ml configuration');
    }

    const validate = (settings: any, size: string) => {
      if (typeof settings.range1to9 !== 'number' ||
          typeof settings.range10to49 !== 'number' ||
          typeof settings.range50to99 !== 'number' ||
          typeof settings.range100plus !== 'number') {
        throw new Error(`Invalid price settings for ${size}`);
      }
    };

    validate(config['5ml'], '5ml');
    validate(config['20ml'], '20ml');

    return config as GlobalPriceConfig;
  } catch (error) {
    throw new Error(`Failed to parse price config: ${error.message}`);
  }
}

/**
 * Format giá config thành JSON string để lưu vào DB
 */
export function formatPriceConfig(config: GlobalPriceConfig): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Default price config (sử dụng khi chưa có settings)
 */
export const DEFAULT_PRICE_CONFIG: GlobalPriceConfig = {
  '5ml': {
    range1to9: 139000,
    range10to49: 109000,
    range50to99: 104000,
    range100plus: 99000
  },
  '20ml': {
    range1to9: 450000,
    range10to49: 360000,
    range50to99: 345000,
    range100plus: 330000
  }
};
