import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
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
  private transporter: nodemailer.Transporter;
  private readonly templatesPath: string;
  private readonly companyInfo: {
    name: string;
    website: string;
    email: string;
    hotline: string;
  };

  constructor(private readonly configService: ConfigService) {
    // Initialize transporter
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });

    // Set templates path
    this.templatesPath = path.join(__dirname, 'templates');

    // Company info for email footers
    this.companyInfo = {
      name: this.configService.get<string>('COMPANY_NAME', 'LD Group'),
      website: this.configService.get<string>('COMPANY_WEBSITE', 'https://doitac.ldgroup.vn'),
      email: this.configService.get<string>('COMPANY_EMAIL', 'support@ldgroup.vn'),
      hotline: this.configService.get<string>('COMPANY_HOTLINE', '076 788 6252'),
    };

    // Verify connection on startup
    this.verifyConnection();

    // Register Handlebars helpers
    this.registerHelpers();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log('✅ Email service is ready to send emails');
    } catch (error) {
      this.logger.error('❌ Email service connection failed:', error);
    }
  }

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
   * Send email with template
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
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

      // Send email
      const info = await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM', '"LD Group" <support@ldgroup.vn>'),
        to,
        subject,
        html: emailHtml,
        text: emailText,
      });

      this.logger.log(`✅ Email sent successfully to ${to}: ${info.messageId}`);
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
      subject: 'Yêu cầu đặt lại mật khẩu - LD Group',
      template: 'reset-password',
      context: {
        username,
        resetUrl,
        expiryHours: 1,
      },
    });
  }

  /**
   * Send order created notification
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
    return this.sendEmail({
      to,
      subject: `Đơn hàng ${orderData.orderNumber} đã được tạo - LD Group`,
      template: 'order-created',
      context: orderData,
    });
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
      subject: `Đơn hàng ${orderData.orderNumber} đã thanh toán - LD Group`,
      template: 'order-confirmed',
      context: orderData,
    });
  }

  /**
   * Send commission earned notification
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
    return this.sendEmail({
      to,
      subject: `Bạn nhận được hoa hồng ${commissionData.amount.toLocaleString('vi-VN')}đ - LD Group`,
      template: 'commission-earned',
      context: commissionData,
    });
  }

  /**
   * Send withdrawal approved notification
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
    return this.sendEmail({
      to,
      subject: `Yêu cầu rút tiền ${withdrawalData.amount.toLocaleString('vi-VN')}đ đã được duyệt - LD Group`,
      template: 'withdrawal-approved',
      context: withdrawalData,
    });
  }

  /**
   * Send withdrawal completed notification
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
    return this.sendEmail({
      to,
      subject: `Rút tiền ${withdrawalData.amount.toLocaleString('vi-VN')}đ hoàn tất - LD Group`,
      template: 'withdrawal-completed',
      context: withdrawalData,
    });
  }
}
