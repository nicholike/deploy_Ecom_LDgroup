import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@shared/constants/user-roles.constant';
import { PricingService } from '@infrastructure/services/pricing/pricing.service';
import { formatPriceConfig, GlobalPriceConfig } from '@shared/utils/global-pricing.util';
import { UpdateGlobalPricingDto } from '@presentation/http/dto/update-global-pricing.dto';

/**
 * SETTINGS CONTROLLER
 * 
 * Quản lý cấu hình hệ thống:
 * - Commission rates (F1-F6)
 * - System settings (quota, shipping, etc)
 * - Email templates
 * - Bank information
 */
@ApiTags('Admin - Settings')
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
  ) {}

  // ========================================
  // COMMISSION SETTINGS
  // ========================================

  @Get('commission')
  @ApiOperation({ summary: 'Get all commission configurations' })
  @ApiResponse({ status: 200 })
  async getCommissionConfigs() {
    const configs = await this.prisma.commissionConfig.findMany({
      where: { active: true },
      orderBy: { level: 'asc' },
    });

    return {
      success: true,
      data: configs,
    };
  }

  @Put('commission/:level')
  @ApiOperation({ summary: 'Update commission rate for a level' })
  @ApiResponse({ status: 200 })
  async updateCommissionConfig(
    @Param('level') level: string,
    @Body() body: {
      commissionRate: number;
      minOrderValue?: number;
      maxCommission?: number;
    },
  ) {
    const levelNum = parseInt(level);
    if (isNaN(levelNum) || levelNum < 1 || levelNum > 6) {
      throw new HttpException('Invalid level (must be 1-6)', HttpStatus.BAD_REQUEST);
    }

    // Check if config exists
    let config = await this.prisma.commissionConfig.findUnique({
      where: { level: levelNum },
    });

    if (config) {
      // Update existing
      config = await this.prisma.commissionConfig.update({
        where: { level: levelNum },
        data: {
          commissionRate: body.commissionRate,
          minOrderValue: body.minOrderValue ?? null,
          maxCommission: body.maxCommission ?? null,
        },
      });
    } else {
      // Create new
      config = await this.prisma.commissionConfig.create({
        data: {
          level: levelNum,
          commissionRate: body.commissionRate,
          minOrderValue: body.minOrderValue ?? null,
          maxCommission: body.maxCommission ?? null,
          commissionType: 'PERCENTAGE',
          active: true,
        },
      });
    }

    return {
      success: true,
      message: `Commission rate for F${levelNum} updated successfully`,
      data: config,
    };
  }

  // ========================================
  // SYSTEM SETTINGS
  // ========================================

  @Get('system')
  @ApiOperation({ summary: 'Get all system settings' })
  @ApiResponse({ status: 200 })
  async getSystemSettings(@Query('category') category?: string) {
    const where = category ? { category } : {};

    const settings = await this.prisma.systemSetting.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    // Group by category
    const grouped = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {} as Record<string, any[]>);

    return {
      success: true,
      data: {
        settings,
        grouped,
      },
    };
  }

  @Get('system/:key')
  @ApiOperation({ summary: 'Get a specific system setting by key' })
  @ApiResponse({ status: 200 })
  async getSystemSetting(@Param('key') key: string) {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new HttpException('Setting not found', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      data: setting,
    };
  }

  @Post('system')
  @ApiOperation({ summary: 'Create a new system setting' })
  @ApiResponse({ status: 201 })
  async createSystemSetting(
    @Body()
    body: {
      key: string;
      value: string;
      type?: string;
      category?: string;
      label: string;
      description?: string;
      required?: boolean;
      editable?: boolean;
    },
  ) {
    const setting = await this.prisma.systemSetting.create({
      data: {
        key: body.key,
        value: body.value,
        type: body.type || 'STRING',
        category: body.category || 'GENERAL',
        label: body.label,
        description: body.description,
        required: body.required ?? false,
        editable: body.editable ?? true,
      },
    });

    return {
      success: true,
      message: 'Setting created successfully',
      data: setting,
    };
  }

  @Put('system/:key')
  @ApiOperation({ summary: 'Update a system setting' })
  @ApiResponse({ status: 200 })
  async updateSystemSetting(
    @Param('key') key: string,
    @Body() body: { value: string; label?: string; description?: string },
  ) {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new HttpException('Setting not found', HttpStatus.NOT_FOUND);
    }

    if (!setting.editable) {
      throw new HttpException('This setting is not editable', HttpStatus.FORBIDDEN);
    }

    const updated = await this.prisma.systemSetting.update({
      where: { key },
      data: {
        value: body.value,
        label: body.label ?? setting.label,
        description: body.description ?? setting.description,
      },
    });

    return {
      success: true,
      message: 'Setting updated successfully',
      data: updated,
    };
  }

  // ========================================
  // BULK SETTINGS INIT
  // ========================================

  @Post('init-default')
  @ApiOperation({ summary: 'Initialize default system settings (only if not exists)' })
  @ApiResponse({ status: 200 })
  async initDefaultSettings() {
    const defaultSettings = [
      // GENERAL
      {
        key: 'default_quota_limit',
        value: '300',
        type: 'NUMBER',
        category: 'GENERAL',
        label: 'Hạn mức mua hàng mặc định',
        description: 'Số lượng sản phẩm tối đa mỗi user có thể mua trong 30 ngày',
        required: true,
        editable: true,
      },
      {
        key: 'quota_period_days',
        value: '30',
        type: 'NUMBER',
        category: 'GENERAL',
        label: 'Chu kỳ hạn mức (ngày)',
        description: 'Số ngày của 1 chu kỳ hạn mức mua hàng',
        required: true,
        editable: true,
      },
      {
        key: 'site_name',
        value: 'LD Perfume Oil Luxury',
        type: 'STRING',
        category: 'GENERAL',
        label: 'Tên website',
        description: 'Tên hiển thị của website',
        required: true,
        editable: true,
      },
      {
        key: 'support_email',
        value: 'support@ldperfume.com',
        type: 'STRING',
        category: 'GENERAL',
        label: 'Email hỗ trợ',
        description: 'Email liên hệ hỗ trợ khách hàng',
        required: true,
        editable: true,
      },
      
      // SHIPPING
      {
        key: 'free_shipping_threshold',
        value: '0',
        type: 'NUMBER',
        category: 'SHIPPING',
        label: 'Ngưỡng miễn phí ship',
        description: 'Giá trị đơn hàng tối thiểu để được miễn phí vận chuyển (0 = luôn miễn phí)',
        required: true,
        editable: true,
      },
      {
        key: 'default_shipping_fee',
        value: '0',
        type: 'NUMBER',
        category: 'SHIPPING',
        label: 'Phí vận chuyển mặc định',
        description: 'Phí vận chuyển mặc định nếu không đủ điều kiện miễn phí',
        required: true,
        editable: true,
      },
      
      // COMMISSION
      {
        key: 'commission_payout_day',
        value: '1',
        type: 'NUMBER',
        category: 'COMMISSION',
        label: 'Ngày thanh toán hoa hồng',
        description: 'Ngày trong tháng để thanh toán hoa hồng (1-28)',
        required: true,
        editable: true,
      },
      
      // WITHDRAWAL
      {
        key: 'min_withdrawal_amount',
        value: '100000',
        type: 'NUMBER',
        category: 'BANK',
        label: 'Số tiền rút tối thiểu',
        description: 'Số tiền tối thiểu cho mỗi lần rút tiền (VNĐ)',
        required: true,
        editable: true,
      },
      {
        key: 'max_withdrawal_amount',
        value: '50000000',
        type: 'NUMBER',
        category: 'BANK',
        label: 'Số tiền rút tối đa',
        description: 'Số tiền tối đa cho mỗi lần rút tiền (VNĐ)',
        required: true,
        editable: true,
      },
      {
        key: 'withdrawal_processing_days',
        value: '3',
        type: 'NUMBER',
        category: 'BANK',
        label: 'Thời gian xử lý rút tiền',
        description: 'Số ngày để xử lý yêu cầu rút tiền',
        required: true,
        editable: true,
      },
      
      // BANK INFO
      {
        key: 'company_bank_name',
        value: 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)',
        type: 'STRING',
        category: 'BANK',
        label: 'Tên ngân hàng công ty',
        description: 'Ngân hàng nhận thanh toán',
        required: false,
        editable: true,
      },
      {
        key: 'company_bank_account',
        value: '1234567890',
        type: 'STRING',
        category: 'BANK',
        label: 'Số tài khoản công ty',
        description: 'Số tài khoản ngân hàng công ty',
        required: false,
        editable: true,
      },
      {
        key: 'company_bank_account_name',
        value: 'CONG TY TNHH LD PERFUME',
        type: 'STRING',
        category: 'BANK',
        label: 'Tên chủ tài khoản',
        description: 'Tên chủ tài khoản ngân hàng công ty',
        required: false,
        editable: true,
      },
      
      // EMAIL TEMPLATES
      {
        key: 'email_order_confirmation',
        value: JSON.stringify({
          subject: 'Xác nhận đơn hàng #{orderNumber}',
          body: 'Cảm ơn bạn đã đặt hàng tại {siteName}. Mã đơn hàng của bạn là: {orderNumber}',
        }),
        type: 'EMAIL_TEMPLATE',
        category: 'EMAIL',
        label: 'Email xác nhận đơn hàng',
        description: 'Template email gửi khi đơn hàng được tạo',
        required: false,
        editable: true,
      },
      {
        key: 'email_commission_earned',
        value: JSON.stringify({
          subject: 'Bạn nhận được hoa hồng mới',
          body: 'Chúc mừng! Bạn vừa nhận được {amount} VNĐ hoa hồng từ đơn hàng #{orderNumber}',
        }),
        type: 'EMAIL_TEMPLATE',
        category: 'EMAIL',
        label: 'Email thông báo hoa hồng',
        description: 'Template email gửi khi nhận được hoa hồng',
        required: false,
        editable: true,
      },
    ];

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const setting of defaultSettings) {
      try {
        const existing = await this.prisma.systemSetting.findUnique({
          where: { key: setting.key },
        });

        if (!existing) {
          await this.prisma.systemSetting.create({ data: setting });
          results.created++;
        } else {
          results.skipped++;
        }
      } catch (error: any) {
        results.errors.push(`${setting.key}: ${error.message}`);
      }
    }

    return {
      success: true,
      message: `Initialized ${results.created} settings, skipped ${results.skipped} existing`,
      data: results,
    };
  }

  // ========================================
  // GLOBAL PRICING SETTINGS
  // ========================================

  @Get('pricing/global')
  @ApiOperation({ summary: 'Get global product pricing configuration' })
  @ApiResponse({ status: 200 })
  async getGlobalPricing() {
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
  }

  @Put('pricing/global')
  @ApiOperation({ summary: 'Update global product pricing configuration' })
  @ApiResponse({ status: 200 })
  async updateGlobalPricing(@Body() dto: UpdateGlobalPricingDto) {
    this.logger.log('=== PRICING UPDATE START ===');
    this.logger.log('1. Raw DTO:', dto);
    this.logger.log('2. DTO type:', typeof dto);
    this.logger.log('3. DTO keys:', Object.keys(dto));
    this.logger.log('4. DTO["5ml"]:', dto['5ml']);
    this.logger.log('5. DTO["20ml"]:', dto['20ml']);
    this.logger.log('6. JSON.stringify(dto):', JSON.stringify(dto));

    const config: GlobalPriceConfig = {
      '5ml': dto['5ml'],
      '20ml': dto['20ml'],
    };

    this.logger.log('7. Config after mapping:', config);
    const jsonValue = formatPriceConfig(config);
    this.logger.log('8. JSON value to save:', jsonValue);

    // Upsert setting
    await this.prisma.systemSetting.upsert({
      where: { key: 'global_product_pricing' },
      create: {
        key: 'global_product_pricing',
        value: jsonValue,
        type: 'JSON',
        category: 'PRICING',
        label: 'Cấu hình giá sản phẩm toàn cục',
        description: 'Giá theo bội số cho sản phẩm 5ml và 20ml',
        required: true,
        editable: true,
      },
      update: {
        value: jsonValue,
      },
    });

    // Clear cache
    this.pricingService.clearCache();

    return {
      success: true,
      message: 'Global pricing updated successfully',
      data: config,
    };
  }
}


