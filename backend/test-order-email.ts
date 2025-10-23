import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { EmailService } from './src/infrastructure/services/email/email.service';

async function testOrderEmail() {
  console.log('🚀 Starting email test...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const emailService = app.get(EmailService);

  // 🧪 Test data
  const testEmail = 'dieplai@example.com'; // ⚠️ THAY ĐỔI EMAIL NÀY
  const testOrderData = {
    username: 'Diep Lai',
    orderNumber: 'ORD2510230001',
    totalAmount: 1500000, // 1.5 triệu VNĐ
    paidAt: new Date(),
  };

  console.log('📧 Sending test email to:', testEmail);
  console.log('📦 Order data:', testOrderData);
  console.log('');

  try {
    const result = await emailService.sendOrderConfirmedEmail(
      testEmail,
      testOrderData,
    );

    if (result) {
      console.log('✅ Email sent successfully!');
      console.log('📬 Check your inbox:', testEmail);
      console.log('📁 Also check SPAM folder if not in inbox');
    } else {
      console.log('❌ Failed to send email');
      console.log('⚠️ Check if RESEND_API_KEY is set correctly');
    }
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }

  await app.close();
  console.log('\n🏁 Test completed');
}

testOrderEmail();

