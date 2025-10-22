import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PricingService } from '@infrastructure/services/pricing/pricing.service';
import { formatPriceConfig } from '@shared/utils/global-pricing.util';
import { Public } from '@shared/decorators/public.decorator';

/**
 * PUBLIC SETTINGS CONTROLLER
 * 
 * Endpoints công khai không cần authentication
 * - Pricing information (cho cart/checkout)
 */
@ApiTags('Public - Settings')
@Controller('settings')
@Public()
export class PublicSettingsController {
  private readonly logger = new Logger(PublicSettingsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
  ) {}

  @Get('pricing/global')
  @ApiOperation({ 
    summary: 'Get global product pricing configuration (Public)',
    description: 'Public endpoint for getting pricing tiers. No authentication required.'
  })
  @ApiResponse({ status: 200, description: 'Returns pricing configuration' })
  async getGlobalPricing() {
    try {
      const config = await this.pricingService.getPriceConfig();

      // Ensure config exists in DB (auto-create if not exists)
      const existing = await this.prisma.systemSetting.findUnique({
        where: { key: 'global_product_pricing' },
      });

      if (!existing) {
        // Auto-create with current config (from default)
        await this.prisma.systemSetting.create({
          data: {
            key: 'global_product_pricing',
            value: formatPriceConfig(config),
            type: 'JSON',
            category: 'PRICING',
            label: 'Cấu hình giá sản phẩm toàn cục',
            description: 'Giá theo bội số cho sản phẩm 5ml và 20ml',
            required: true,
            editable: true,
          },
        });
      }

      return {
        success: true,
        data: config,
      };
    } catch (error) {
      this.logger.error('Failed to get global pricing:', error);
      throw new HttpException(
        'Failed to retrieve pricing configuration',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}

