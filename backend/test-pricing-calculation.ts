import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPricing() {
  console.log('🧪 Testing pricing calculation...\n');

  // 1. Get pricing config from database
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'global_product_pricing' }
  });

  console.log('📦 Database config:');
  console.log(setting?.value);
  console.log('');

  if (!setting?.value) {
    console.log('❌ No pricing config found in database!');
    return;
  }

  // 2. Parse config
  const config = JSON.parse(setting.value);
  console.log('🔍 Parsed config:');
  console.log(JSON.stringify(config, null, 2));
  console.log('');

  // 3. NEW LOGIC: Range-based calculation for 125 items of 5ml
  const quantity = 125;
  let pricePerUnit: number;
  let range: string;

  if (quantity >= 100) {
    pricePerUnit = config['5ml'].range100plus;
    range = '100+';
  } else if (quantity >= 50) {
    pricePerUnit = config['5ml'].range50to99;
    range = '50-99';
  } else if (quantity >= 10) {
    pricePerUnit = config['5ml'].range10to49;
    range = '10-49';
  } else {
    pricePerUnit = config['5ml'].range1to9;
    range = '1-9';
  }

  const total = quantity * pricePerUnit;

  console.log('📊 Range-based calculation for 125 items (5ml):');
  console.log(`  - Quantity: ${quantity} bottles`);
  console.log(`  - Applied range: ${range}`);
  console.log(`  - Price per unit: ${pricePerUnit.toLocaleString()}đ`);
  console.log(`  - TOTAL: ${quantity} × ${pricePerUnit.toLocaleString()}đ = ${total.toLocaleString()}đ`);
  console.log('');

  const expectedTotal = 125 * 99000; // 125 bottles at range100plus price
  if (total === expectedTotal) {
    console.log(`✅ Calculation is CORRECT! (${expectedTotal.toLocaleString()}đ)`);
  } else {
    console.log(`❌ Calculation is WRONG! Expected ${expectedTotal.toLocaleString()}đ but got ${total.toLocaleString()}đ`);
  }

  await prisma.$disconnect();
}

testPricing().catch(console.error);
