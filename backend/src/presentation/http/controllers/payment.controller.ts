import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { Public } from '@shared/decorators/public.decorator';
import { UserRole } from '@shared/constants/user-roles.constant';
import { PaymentService } from '@infrastructure/services/payment/payment.service';

/**
 * PAYMENT CONTROLLER
 * 
 * Endpoints:
 * - Webhook from SePay (public)
 * - Get payment info for order (user)
 * - Check payment status (user)
 * - Get all transactions (admin)
 */
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * GET /payment/sepay-webhook
   * Webhook verification endpoint for SePay
   * SePay may send GET request first to verify the endpoint is accessible
   */
  @Public()
  @SkipThrottle() // Skip rate limiting for SePay webhook verification
  @Get('sepay-webhook')
  @HttpCode(HttpStatus.OK)
  async verifySepayWebhook() {
    return {
      success: true,
      message: 'Webhook endpoint is ready',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /payment/sepay-webhook
   * Webhook endpoint to receive payment notifications from SePay
   * Reference: https://sepay.vn/lap-trinh-cong-thanh-toan.html
   *
   * This endpoint is PUBLIC (no authentication required)
   * SePay will send POST request with transaction data
   */
  @Public()
  @SkipThrottle() // Skip rate limiting for SePay webhooks
  @Post('sepay-webhook')
  @HttpCode(HttpStatus.OK)
  async handleSepayWebhook(
    @Body() webhookData: any,
    @Request() req: any,
  ) {
    try {
      console.log('📥 Received SePay webhook:', JSON.stringify(webhookData, null, 2));
      console.log('📋 Request headers:', JSON.stringify(req.headers, null, 2));

      // ✅ ENFORCE API Key verification in production
      // 🔧 TEMPORARILY DISABLED FOR TESTING - RE-ENABLE AFTER DEBUGGING
      /*
      if (process.env.SEPAY_API_KEY && process.env.NODE_ENV === 'production') {
        const authHeader = req.headers['authorization'];
        const expectedAuth = `Apikey ${process.env.SEPAY_API_KEY}`;

        if (authHeader !== expectedAuth) {
          console.error('⛔ Unauthorized SePay webhook attempt');
          console.error('Expected:', expectedAuth);
          console.error('Received:', authHeader);
          console.error('Source IP:', req.ip);
          console.error('📊 Webhook Data (UNAUTHORIZED):', JSON.stringify(webhookData, null, 2));

          // Still return 200 to prevent SePay from retrying
          // But log the data for manual processing
          return {
            success: false,
            message: 'Unauthorized - Invalid API key',
            note: 'Data logged for manual review'
          };
        }

        console.log('✅ SePay webhook authorization verified');
      }
      */

      console.log('⚠️  API Key verification DISABLED for testing');
      console.log('📋 Authorization header:', req.headers['authorization']);

      // Process the webhook
      const result = await this.paymentService.processWebhook(webhookData);

      // Return success response (required by SePay)
      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      console.error('❌ Failed to process SePay webhook:', error);
      // Still return success to prevent SePay from retrying
      // Log the error for manual review
      return {
        success: true,
        message: 'Webhook received but processing failed',
        error: error.message,
      };
    }
  }


  /**
   * GET /payment/info/:orderId
   * Get payment information for an order (to display QR code)
   * Supports both Pending Order Number (PD25XXX) and Order ID (UUID)
   */
  @Get('info/:orderId')
  @UseGuards(JwtAuthGuard)
  async getPaymentInfo(
    @Param('orderId') orderId: string,
    @Request() req: any,
  ) {
    const paymentInfo = await this.paymentService.getPaymentInfo(orderId);

    // TODO: Add permission check for order owner or admin
    // For now, allow any authenticated user to view payment info

    // Generate SePay QR URL
    // Use Virtual Account for better auto-matching with webhook
    const vaNumber = process.env.SEPAY_VA_NUMBER || paymentInfo.bankAccount.accountNumber;

    const qrCodeUrl = this.generateSepayQRUrl(
      vaNumber,
      paymentInfo.bankAccount.bankCode,
      paymentInfo.amount,
      paymentInfo.description,
    );

    return {
      ...paymentInfo,
      qrCodeUrl,
    };
  }

  /**
   * GET /payment/status/:orderId
   * Check payment status of an order
   */
  @Get('status/:orderId')
  @UseGuards(JwtAuthGuard)
  async checkPaymentStatus(
    @Param('orderId') orderId: string,
    @Request() req: any,
  ) {
    return this.paymentService.checkPaymentStatus(orderId);
  }

  /**
   * GET /payment/admin/transactions
   * Get all bank transactions (admin only)
   */
  @Get('admin/transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllTransactions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    return this.paymentService.getAllTransactions(pageNum, limitNum);
  }

  /**
   * Generate SePay QR Code URL
   * Reference: https://docs.sepay.vn/tao-qr-code-vietqr-dong.html
   *
   * Format: https://qr.sepay.vn/img?acc=ACCOUNT&bank=BANK&amount=AMOUNT&des=DESCRIPTION
   *
   * @param accountNumber - Số tài khoản hoặc Virtual Account
   * @param bankCode - Mã ngân hàng (VD: BIDV, VCB, MB)
   * @param amount - Số tiền
   * @param description - Nội dung chuyển khoản (mã đơn hàng)
   */
  private generateSepayQRUrl(
    accountNumber: string,
    bankCode: string,
    amount: number,
    description: string,
  ): string {
    // SePay QR API
    // Note: curl test có thể bị 403 do thiếu User-Agent, nhưng <img> tag hoạt động bình thường
    const baseUrl = 'https://qr.sepay.vn/img';
    const qrUrl = `${baseUrl}?acc=${accountNumber}&bank=${bankCode}&amount=${amount}&des=${encodeURIComponent(description)}`;

    return qrUrl;
  }

  /**
   * ❌ REMOVED: Test webhook endpoint
   *
   * Security: Test endpoints removed for production deployment
   * For testing webhooks in production, use SePay's official test environment
   * or create a separate admin-only testing endpoint with proper authentication
   */
}

