import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migratePricingConfig() {
  console.log('🔄 Migrating pricing config to new format...\n');

  try {
    // Check current config
    const currentSetting = await prisma.systemSetting.findUnique({
      where: { key: 'global_product_pricing' }
    });

    if (currentSetting) {
      console.log('📋 Current config found:');
      console.log(currentSetting.value);
      console.log('\n');

      // Try to parse it
      const oldConfig = JSON.parse(currentSetting.value);

      // Check if it's old format (tier100, tier10, single)
      if (oldConfig['5ml']?.tier100 !== undefined) {
        console.log('🔧 Detected OLD format. Converting to NEW format...\n');

        // Convert to new format
        const newConfig = {
          '5ml': {
            range1to9: oldConfig['5ml'].single || 139000,
            range10to99: oldConfig['5ml'].tier10 || 109000,
            range100plus: oldConfig['5ml'].tier100 || 99000
          },
          '20ml': {
            range1to9: oldConfig['20ml'].single || 450000,
            range10to99: oldConfig['20ml'].tier10 || 360000,
            range100plus: oldConfig['20ml'].tier100 || 330000
          }
        };

        // Update database
        await prisma.systemSetting.update({
          where: { key: 'global_product_pricing' },
          data: { value: JSON.stringify(newConfig, null, 2) }
        });

        console.log('✅ Successfully converted to new format:');
        console.log(JSON.stringify(newConfig, null, 2));
      } else if (oldConfig['5ml']?.range1to9 !== undefined) {
        console.log('✅ Already in NEW format. No migration needed.');
        console.log(JSON.stringify(oldConfig, null, 2));
      } else {
        console.log('⚠️  Unknown format. Please check manually.');
      }
    } else {
      console.log('📝 No existing config. Creating default config...\n');

      const defaultConfig = {
        '5ml': {
          range1to9: 139000,
          range10to99: 109000,
          range100plus: 99000
        },
        '20ml': {
          range1to9: 450000,
          range10to99: 360000,
          range100plus: 330000
        }
      };

      await prisma.systemSetting.create({
        data: {
          key: 'global_product_pricing',
          value: JSON.stringify(defaultConfig, null, 2),
          label: 'Cấu hình giá sản phẩm',
          description: 'Giá theo khoảng số lượng cho 5ml và 20ml',
          category: 'PRICING',
          type: 'JSON',
          required: true,
          editable: false
        }
      });

      console.log('✅ Default config created:');
      console.log(JSON.stringify(defaultConfig, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migratePricingConfig();
