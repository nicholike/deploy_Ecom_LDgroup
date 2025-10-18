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
    // For TPBank: Use BANK_ACCOUNT_NUMBER (85558888999) as account number
    // VA number (YRK) is only used for prefix in description
    const accountNumber = paymentInfo.bankAccount.accountNumber;

    const qrCodeUrl = this.generateSepayQRUrl(
      accountNumber,
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
   * Supports:
   * - Direct VA (BIDV): description = "PD25XXXXX"
   * - Indirect VA (TPBank): description = "TKPYRK PD25XXXXX"
   *
   * @param accountNumber - Số tài khoản hoặc Virtual Account
   * @param bankCode - Mã ngân hàng (VD: BIDV, VCB, TPBank)
   * @param amount - Số tiền
   * @param description - Nội dung chuyển khoản (mã đơn hàng)
   */
  private generateSepayQRUrl(
    accountNumber: string,
    bankCode: string,
    amount: number,
    description: string,
  ): string {
    // For direct account transfer (no VA needed)
    // Just use the order number as description
    // SePay will hook directly to the main account
    const finalDescription = description;
    
    // SePay QR API
    // Note: curl test có thể bị 403 do thiếu User-Agent, nhưng <img> tag hoạt động bình thường
    const baseUrl = 'https://qr.sepay.vn/img';
    const qrUrl = `${baseUrl}?acc=${accountNumber}&bank=${bankCode}&amount=${amount}&des=${encodeURIComponent(finalDescription)}`;

    return qrUrl;
  }

  /**
   * GET /payment/test-webhook
   * Test webhook endpoint for debugging
   * This endpoint simulates a webhook call for testing
   */
  @Get('test-webhook')
  @HttpCode(HttpStatus.OK)
  async testWebhook() {
    const testData = {
      id: `test_${Date.now()}`,
      transaction_date: new Date().toISOString(),
      transaction_content: 'TKPYRK PD25TEST01',
      amount_in: 100000,
      sub_account: '',
    };

    console.log('🧪 Testing webhook with data:', JSON.stringify(testData, null, 2));

    try {
      const result = await this.paymentService.processWebhook(testData);
      return {
        success: true,
        message: 'Test webhook processed successfully',
        testData,
        result,
      };
    } catch (error) {
      console.error('❌ Test webhook failed:', error);
      return {
        success: false,
        message: 'Test webhook failed',
        error: error.message,
        testData,
      };
    }
  }
}

