import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

export interface EmailOptions {
  to: string;
  subject: string;
  template?: string;
  context?: Record<string, any>;
  html?: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private readonly templatesPath: string;
  private readonly companyInfo: {
    name: string;
    website: string;
    email: string;
    hotline: string;
  };

  constructor(private readonly configService: ConfigService) {
    // 🚀 Initialize Resend (simple and works on Railway)
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');

    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
      this.logger.log('📧 Email service initialized with Resend');
    } else {
      this.logger.warn('⚠️ RESEND_API_KEY not found. Email service disabled.');
      this.logger.warn('💡 Get your free API key at: https://resend.com/api-keys');
    }

    // Set templates path
    this.templatesPath = path.join(__dirname, 'templates');

    // Company info for email footers
    this.companyInfo = {
      name: this.configService.get<string>('COMPANY_NAME', 'LD Perfume Oil Luxury'),
      website: this.configService.get<string>('COMPANY_WEBSITE', 'https://doitac.ldgroup.vn'),
      email: this.configService.get<string>('COMPANY_EMAIL', 'support@ldgroup.vn'),
      hotline: this.configService.get<string>('COMPANY_HOTLINE', '076 788 6252'),
    };

    // 🔧 RAILWAY FIX: Disable verification on startup
    // Railway may block SMTP outbound connections (ports 465, 587)
    // Email will fail silently if SMTP is blocked, but app will start normally
    // Uncomment below to enable verification in local development
    // this.verifyConnection();

    // Register Handlebars helpers
    this.registerHelpers();
  }

  // Verification disabled - not needed when using SendGrid or when emails are optional
  // private async verifyConnection() {
  //   if (!this.transporter) return;
  //   try {
  //     const verifyPromise = this.transporter.verify();
  //     const timeoutPromise = new Promise((_, reject) =>
  //       setTimeout(() => reject(new Error('Verification timeout after 30s')), 30000)
  //     );
  //     await Promise.race([verifyPromise, timeoutPromise]);
  //     this.logger.log('✅ Email service is ready to send emails');
  //   } catch (error) {
  //     this.logger.error('❌ Email service connection failed:', error);
  //   }
  // }

  private registerHelpers() {
    // Helper to format currency
    Handlebars.registerHelper('formatCurrency', (amount: number) => {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(amount);
    });

    // Helper to format date
    Handlebars.registerHelper('formatDate', (date: Date | string) => {
      return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(date));
    });
  }

  /**
   * Send email with template using Resend
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Check if Resend is initialized
      if (!this.resend) {
        this.logger.debug('📧 Email service disabled (no RESEND_API_KEY)');
        return false;
      }

      const { to, subject, template, context, html, text } = options;

      let emailHtml = html;
      let emailText = text;

      // If template is provided, compile it
      if (template) {
        const templatePath = path.join(this.templatesPath, `${template}.hbs`);

        if (fs.existsSync(templatePath)) {
          const templateContent = fs.readFileSync(templatePath, 'utf-8');
          const compiledTemplate = Handlebars.compile(templateContent);

          // Merge context with company info
          const templateContext = {
            ...context,
            company: this.companyInfo,
          };

          emailHtml = compiledTemplate(templateContext);
        } else {
          this.logger.warn(`Template not found: ${template}`);
          // Fallback to html if provided
          if (!html) {
            throw new Error(`Template ${template} not found and no html provided`);
          }
        }
      }

      const fromEmail = this.configService.get<string>('EMAIL_FROM', 'LD Perfume Oil Luxury <onboarding@resend.dev>');

      // 🚀 Send email using Resend (super simple!)
      await this.resend.emails.send({
        from: fromEmail,
        to,
        subject,
        html: emailHtml || emailText || subject,
        text: emailText,
      });

      this.logger.log(`✅ Email sent via Resend to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, resetUrl: string, username: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: 'Đặt lại mật khẩu - LD Perfume Oil Luxury',
      template: 'reset-password',
      context: {
        username,
        resetUrl,
        expiryHours: 24,
      },
    });
  }

  /**
   * Send order created notification
   * 🔕 DISABLED: Email service disabled - user can check order in dashboard
   */
  async sendOrderCreatedEmail(
    to: string,
    orderData: {
      username: string;
      orderNumber: string;
      totalAmount: number;
      items: Array<{ name: string; quantity: number; price: number }>;
      shippingAddress: string;
      createdAt: Date;
    },
  ): Promise<boolean> {
    this.logger.debug(`🔕 Order created email disabled. User can check order ${orderData.orderNumber} in dashboard.`);
    return true; // Return true to not break existing code
  }

  /**
   * Send order confirmed/paid notification
   */
  async sendOrderConfirmedEmail(
    to: string,
    orderData: {
      username: string;
      orderNumber: string;
      totalAmount: number;
      paidAt: Date;
    },
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: 'Đặt hàng thành công - LD Perfume Oil Luxury',
      template: 'order-confirmed',
      context: {
        username: orderData.username,
        orderNumber: orderData.orderNumber,
        totalAmount: orderData.totalAmount,
        paidAt: orderData.paidAt,
      },
    });
  }

  /**
   * Send commission earned notification
   * 🔕 DISABLED: User requirement - only send order created and password reset emails
   */
  async sendCommissionEarnedEmail(
    to: string,
    commissionData: {
      username: string;
      amount: number;
      orderNumber: string;
      level: number;
      fromUser: string;
      earnedAt: Date;
    },
  ): Promise<boolean> {
    this.logger.debug(`🔕 Commission earned email disabled for ${to}`);
    return true; // Return true to not break existing code
  }

  /**
   * Send withdrawal approved notification
   * 🔕 DISABLED: User requirement - only send order created and password reset emails
   */
  async sendWithdrawalApprovedEmail(
    to: string,
    withdrawalData: {
      username: string;
      amount: number;
      bankName: string;
      accountNumber: string;
      approvedAt: Date;
    },
  ): Promise<boolean> {
    this.logger.debug(`🔕 Withdrawal approved email disabled for ${to}`);
    return true; // Return true to not break existing code
  }

  /**
   * Send withdrawal completed notification
   * 🔕 DISABLED: User requirement - only send order created and password reset emails
   */
  async sendWithdrawalCompletedEmail(
    to: string,
    withdrawalData: {
      username: string;
      amount: number;
      bankName: string;
      accountNumber: string;
      completedAt: Date;
    },
  ): Promise<boolean> {
    this.logger.debug(`🔕 Withdrawal completed email disabled for ${to}`);
    return true; // Return true to not break existing code
  }
}
