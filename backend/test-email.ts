import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

async function testEmail() {
  console.log('🚀 Testing Order Confirmation Email (Smaller version)...\n');

  const resend = new Resend('re_6KTkqQKr_E9CpXRHgaL3a2aD6Y4zH8rJj');

  Handlebars.registerHelper('formatCurrency', (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  });

  Handlebars.registerHelper('formatDate', (date: Date | string) => {
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  });

  const templatePath = path.join(__dirname, 'src/infrastructure/services/email/templates/order-confirmed.hbs');
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  const compiledTemplate = Handlebars.compile(templateContent);

  const context = {
    username: 'Diep Lai',
    orderNumber: 'ORD2510230001',
    totalAmount: 1500000,
    paidAt: new Date(),
    company: {
      name: 'LD Perfume Oil Luxury',
      website: 'https://doitac.ldgroup.vn',
      email: 'support@ldgroup.vn',
      hotline: '076 788 6252',
    },
  };

  const emailHtml = compiledTemplate(context);
  const testEmail = 'dieptrungnam123@gmail.com';

  console.log('📧 Sending to:', testEmail);
  console.log('📦 Order:', context.orderNumber);
  console.log('💰 Amount:', context.totalAmount.toLocaleString('vi-VN'), 'VNĐ');
  console.log('🎨 Updated: Smaller fonts & compact layout');
  console.log('');

  try {
    const { data, error } = await resend.emails.send({
      from: 'LD Perfume Oil Luxury <onboarding@resend.dev>',
      to: testEmail,
      subject: 'Đặt hàng thành công - LD Perfume Oil Luxury',
      html: emailHtml,
    });

    if (error) {
      console.error('❌ Error:', error);
    } else {
      console.log('✅ Email sent successfully!');
      console.log('📬 Email ID:', data?.id);
      console.log('');
      console.log('👀 Check your inbox:', testEmail);
    }
  } catch (err) {
    console.error('❌ Failed:', err);
  }

  console.log('\n🏁 Test completed');
}

testEmail();
