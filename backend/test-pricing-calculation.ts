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

  // 3. Manual calculation for 125 items of 5ml
  const quantity = 125;
  const tier100Count = Math.floor(quantity / 100); // 1
  const remaining100 = quantity % 100; // 25

  const tier10Count = Math.floor(remaining100 / 10); // 2
  const singleCount = remaining100 % 10; // 5

  const tier100Total = tier100Count * 100 * config['5ml'].tier100;
  const tier10Total = tier10Count * 10 * config['5ml'].tier10;
  const singleTotal = singleCount * config['5ml'].single;

  const total = tier100Total + tier10Total + singleTotal;

  console.log('📊 Manual calculation for 125 items (5ml):');
  console.log(`  - Tier 100: ${tier100Count} × 100 × ${config['5ml'].tier100.toLocaleString()} = ${tier100Total.toLocaleString()}đ`);
  console.log(`  - Tier 10: ${tier10Count} × 10 × ${config['5ml'].tier10.toLocaleString()} = ${tier10Total.toLocaleString()}đ`);
  console.log(`  - Single: ${singleCount} × ${config['5ml'].single.toLocaleString()} = ${singleTotal.toLocaleString()}đ`);
  console.log(`  - TOTAL: ${total.toLocaleString()}đ`);
  console.log('');

  if (total === 12775000) {
    console.log('✅ Calculation is CORRECT! (12,775,000đ)');
  } else {
    console.log(`❌ Calculation is WRONG! Expected 12,775,000đ but got ${total.toLocaleString()}đ`);
  }

  await prisma.$disconnect();
}

testPricing().catch(console.error);
