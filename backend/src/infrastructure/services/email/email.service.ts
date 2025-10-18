import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as sgMail from '@sendgrid/mail';
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
  private transporter: nodemailer.Transporter | null = null;
  private useSendGrid: boolean = false;
  private readonly templatesPath: string;
  private readonly companyInfo: {
    name: string;
    website: string;
    email: string;
    hotline: string;
  };

  constructor(private readonly configService: ConfigService) {
    // Check if SendGrid API key is available (preferred for production)
    const sendGridApiKey = this.configService.get<string>('SENDGRID_API_KEY');

    if (sendGridApiKey) {
      // 🚀 Use SendGrid for production (Railway doesn't block SendGrid API)
      sgMail.setApiKey(sendGridApiKey);
      this.useSendGrid = true;
      this.logger.log('📧 Email service initialized with SendGrid');
    } else {
      // 🏠 Fallback to SMTP for local development
      const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
      const smtpSecure = smtpPort === 465; // Auto-detect: 465 = SSL, 587 = TLS

      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('SMTP_HOST'),
        port: smtpPort,
        secure: smtpSecure, // true for 465 (SSL), false for 587 (TLS)
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASSWORD'),
        },
        connectionTimeout: 60000,
        greetingTimeout: 30000,
        socketTimeout: 60000,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        tls: {
          rejectUnauthorized: true,
          minVersion: 'TLSv1.2',
        },
      });
      this.logger.log('📧 Email service initialized with SMTP (local development)');
    }

    // Set templates path
    this.templatesPath = path.join(__dirname, 'templates');

    // Company info for email footers
    this.companyInfo = {
      name: this.configService.get<string>('COMPANY_NAME', 'LD Group'),
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
   * Send email with template (supports both SendGrid and SMTP)
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

      const fromEmail = this.configService.get<string>('SMTP_FROM', '"LD Group" <support@ldgroup.vn>');

      // Send email using SendGrid or SMTP
      if (this.useSendGrid) {
        // 🚀 SendGrid API
        const msg: any = {
          to,
          from: fromEmail,
          subject,
        };

        // Add content (at least one of html or text is required)
        if (emailHtml) {
          msg.html = emailHtml;
        }
        if (emailText) {
          msg.text = emailText;
        }

        // Fallback: if both html and text are empty, use subject as text
        if (!emailHtml && !emailText) {
          msg.text = subject;
        }

        await sgMail.send(msg);
        this.logger.log(`✅ Email sent via SendGrid to ${to}`);
      } else {
        // 🏠 SMTP (nodemailer)
        if (!this.transporter) {
          throw new Error('SMTP transporter not initialized');
        }

        const info = await this.transporter.sendMail({
          from: fromEmail,
          to,
          subject,
          html: emailHtml,
          text: emailText,
        });

        this.logger.log(`✅ Email sent via SMTP to ${to}: ${info.messageId}`);
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  /**
   * Send password reset email
   * 🔕 DISABLED: Email service disabled - return reset token in API response instead
   */
  async sendPasswordResetEmail(to: string, resetUrl: string, username: string): Promise<boolean> {
    this.logger.debug(`🔕 Password reset email disabled. User should receive token in API response.`);
    return true; // Return true to not break existing code
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
   * 🔕 DISABLED: User requirement - only send order created and password reset emails
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
    this.logger.debug(`🔕 Order confirmed email disabled for ${to}`);
    return true; // Return true to not break existing code
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
