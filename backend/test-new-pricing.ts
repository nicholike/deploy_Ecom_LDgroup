import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testNewPricing() {
  console.log('🧪 Testing NEW Range-Based Pricing Logic\n');
  console.log('='.repeat(60));

  try {
    // Get pricing config
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'global_product_pricing' }
    });

    if (!setting) {
      console.log('❌ No pricing config found!');
      return;
    }

    const config = JSON.parse(setting.value);
    console.log('\n📋 Current Pricing Config:');
    console.log(JSON.stringify(config, null, 2));
    console.log('='.repeat(60));

    // Test scenarios
    const testScenarios = [
      {
        name: 'Scenario 1: Single product - 9 bottles of 5ml',
        items: [{ name: 'Product A (5ml)', quantity: 9, size: '5ml' as const }]
      },
      {
        name: 'Scenario 2: Single product - 15 bottles of 5ml',
        items: [{ name: 'Product A (5ml)', quantity: 15, size: '5ml' as const }]
      },
      {
        name: 'Scenario 3: Single product - 154 bottles of 5ml',
        items: [{ name: 'Product A (5ml)', quantity: 154, size: '5ml' as const }]
      },
      {
        name: 'Scenario 4: Multiple products - total 15 bottles of 5ml',
        items: [
          { name: 'Product A (5ml)', quantity: 5, size: '5ml' as const },
          { name: 'Product B (5ml)', quantity: 7, size: '5ml' as const },
          { name: 'Product C (5ml)', quantity: 3, size: '5ml' as const }
        ]
      },
      {
        name: 'Scenario 5: Mixed sizes - 12x5ml + 8x20ml',
        items: [
          { name: 'Product A (5ml)', quantity: 5, size: '5ml' as const },
          { name: 'Product B (5ml)', quantity: 7, size: '5ml' as const },
          { name: 'Product C (20ml)', quantity: 8, size: '20ml' as const }
        ]
      },
      {
        name: 'Scenario 6: Large order - 120x5ml across multiple products',
        items: [
          { name: 'Product A (5ml)', quantity: 50, size: '5ml' as const },
          { name: 'Product B (5ml)', quantity: 40, size: '5ml' as const },
          { name: 'Product C (5ml)', quantity: 30, size: '5ml' as const }
        ]
      }
    ];

    for (const scenario of testScenarios) {
      console.log(`\n\n📦 ${scenario.name}`);
      console.log('-'.repeat(60));

      // Calculate totals by size
      const totals = new Map<'5ml' | '20ml', number>();
      scenario.items.forEach(item => {
        const current = totals.get(item.size) || 0;
        totals.set(item.size, current + item.quantity);
      });

      console.log('\n📊 Cart Items:');
      scenario.items.forEach(item => {
        console.log(`   • ${item.name}: ${item.quantity} bottles`);
      });

      console.log('\n📈 Total by Size:');
      totals.forEach((total, size) => {
        console.log(`   • ${size}: ${total} bottles`);
      });

      console.log('\n💰 Pricing Calculation:');
      let grandTotal = 0;

      totals.forEach((total, size) => {
        const priceSettings = config[size];
        let pricePerUnit: number;
        let range: string;

        if (total >= 100) {
          pricePerUnit = priceSettings.range100plus;
          range = '100+';
        } else if (total >= 50) {
          pricePerUnit = priceSettings.range50to99;
          range = '50-99';
        } else if (total >= 10) {
          pricePerUnit = priceSettings.range10to49;
          range = '10-49';
        } else {
          pricePerUnit = priceSettings.range1to9;
          range = '1-9';
        }

        const subtotal = total * pricePerUnit;
        grandTotal += subtotal;

        console.log(`   • ${size}:`);
        console.log(`     - Total quantity: ${total} bottles`);
        console.log(`     - Range applied: ${range}`);
        console.log(`     - Price per unit: ${pricePerUnit.toLocaleString('vi-VN')}đ`);
        console.log(`     - Subtotal: ${total} × ${pricePerUnit.toLocaleString('vi-VN')}đ = ${subtotal.toLocaleString('vi-VN')}đ`);
      });

      console.log(`\n🏆 GRAND TOTAL: ${grandTotal.toLocaleString('vi-VN')}đ`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All test scenarios completed!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNewPricing();
