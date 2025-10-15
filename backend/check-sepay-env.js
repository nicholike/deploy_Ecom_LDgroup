/**
 * Check if Sepay environment variables are set correctly
 * Run: railway run node backend/check-sepay-env.js
 */

console.log('🔍 Checking Sepay Environment Variables...\n');

const requiredVars = {
  'SEPAY_VA_NUMBER': process.env.SEPAY_VA_NUMBER,
  'BANK_CODE': process.env.BANK_CODE,
  'BANK_NAME': process.env.BANK_NAME,
  'BANK_ACCOUNT_NUMBER': process.env.BANK_ACCOUNT_NUMBER,
  'BANK_ACCOUNT_NAME': process.env.BANK_ACCOUNT_NAME,
};

let hasIssues = false;

for (const [key, value] of Object.entries(requiredVars)) {
  if (!value) {
    console.log(`❌ ${key}: NOT SET`);
    hasIssues = true;
  } else {
    console.log(`✅ ${key}: ${value}`);
  }
}

console.log('\n📝 QR Code URL Preview:');
const vaNumber = process.env.SEPAY_VA_NUMBER || process.env.BANK_ACCOUNT_NUMBER || 'NOT_SET';
const bankCode = process.env.BANK_CODE || 'BIDV';
const testAmount = 100000;
const testOrderNumber = 'LD25101500001';

const qrUrl = `https://qr.sepay.vn/img?acc=${vaNumber}&bank=${bankCode}&amount=${testAmount}&des=${encodeURIComponent(testOrderNumber)}`;
console.log(qrUrl);

console.log('\n📋 Webhook Endpoint:');
console.log('POST https://api.laistore.online/api/v1/payment/sepay-webhook');

if (hasIssues) {
  console.log('\n⚠️  Some environment variables are missing!');
  console.log('Please set them in Railway dashboard.');
  process.exit(1);
} else {
  console.log('\n✅ All Sepay environment variables are configured correctly!');
}
