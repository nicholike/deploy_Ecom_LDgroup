import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const productsByCategory = {
  // Sản phẩm cho Nam
  nam: [
    {
      name: 'Dior Sauvage - Nước Hoa Nam Mạnh Mẽ',
      sku: 'DIOR-SAUVAGE',
      description: 'Hương thơm nam tính, mạnh mẽ và cuốn hút từ Dior',
      variants: [
        { size: '5ml', price: 500000, salePrice: 450000, stock: 120 },
        { size: '20ml', price: 1300000, salePrice: 1200000, stock: 90 },
        { size: '50ml', price: 2700000, salePrice: 2500000, stock: 60 },
      ],
    },
    {
      name: 'Versace Eros - Hương Nam Quyến Rũ',
      sku: 'VERSACE-EROS',
      description: 'Hương thơm nam tính mạnh mẽ và cuốn hút từ Versace',
      variants: [
        { size: '5ml', price: 440000, salePrice: 390000, stock: 105 },
        { size: '20ml', price: 1180000, salePrice: 1080000, stock: 82 },
        { size: '50ml', price: 2450000, salePrice: 2250000, stock: 52 },
      ],
    },
    {
      name: 'Armani Code - Hương Gỗ Sang Trọng',
      sku: 'ARMANI-CODE',
      description: 'Nước hoa nam với hương gỗ ấm áp, sang trọng và lịch lãm',
      variants: [
        { size: '5ml', price: 480000, salePrice: 430000, stock: 112 },
        { size: '20ml', price: 1280000, salePrice: 1180000, stock: 87 },
        { size: '50ml', price: 2650000, salePrice: 2450000, stock: 57 },
      ],
    },
    {
      name: 'Bleu de Chanel - Hương Gỗ Phương Đông',
      sku: 'BLEU-CHANEL',
      description: 'Nước hoa nam sang trọng với hương gỗ phương đông tinh tế',
      variants: [
        { size: '5ml', price: 520000, salePrice: 470000, stock: 95 },
        { size: '20ml', price: 1350000, salePrice: 1250000, stock: 78 },
        { size: '50ml', price: 2800000, salePrice: 2600000, stock: 48 },
      ],
    },
  ],
  // Sản phẩm cho Nữ
  nu: [
    {
      name: 'Chanel No.5 - Nước Hoa Nữ Sang Trọng',
      sku: 'CHANEL-NO5',
      description: 'Nước hoa kinh điển của Chanel với hương thơm quyến rũ, sang trọng',
      variants: [
        { size: '5ml', price: 450000, salePrice: 400000, stock: 100 },
        { size: '20ml', price: 1200000, salePrice: 1100000, stock: 80 },
        { size: '50ml', price: 2500000, salePrice: 2300000, stock: 50 },
      ],
    },
    {
      name: 'Gucci Bloom - Hương Hoa Nữ Tính',
      sku: 'GUCCI-BLOOM',
      description: 'Nước hoa với hương hoa tươi mát, nữ tính và thanh lịch',
      variants: [
        { size: '5ml', price: 430000, salePrice: 380000, stock: 110 },
        { size: '20ml', price: 1150000, salePrice: 1050000, stock: 85 },
        { size: '50ml', price: 2400000, salePrice: 2200000, stock: 55 },
      ],
    },
    {
      name: 'Yves Saint Laurent Mon Paris',
      sku: 'YSL-MON-PARIS',
      description: 'Nước hoa nữ với hương ngọt ngào, lãng mạn của Paris',
      variants: [
        { size: '5ml', price: 470000, salePrice: 420000, stock: 115 },
        { size: '20ml', price: 1250000, salePrice: 1150000, stock: 88 },
        { size: '50ml', price: 2600000, salePrice: 2400000, stock: 58 },
      ],
    },
    {
      name: 'Lancôme La Vie Est Belle',
      sku: 'LANCOME-LVEB',
      description: 'Nước hoa nữ mang hương thơm của hạnh phúc và niềm vui',
      variants: [
        { size: '5ml', price: 460000, salePrice: 410000, stock: 108 },
        { size: '20ml', price: 1220000, salePrice: 1120000, stock: 86 },
        { size: '50ml', price: 2550000, salePrice: 2350000, stock: 56 },
      ],
    },
  ],
  // Sản phẩm Unisex
  unisex: [
    {
      name: 'Tom Ford Black Orchid - Unisex',
      sku: 'TF-BLACK-ORCHID',
      description: 'Hương thơm huyền bí, sang trọng với note hoa lan đen, phù hợp cả nam và nữ',
      variants: [
        { size: '5ml', price: 550000, salePrice: 500000, stock: 100 },
        { size: '20ml', price: 1400000, salePrice: 1300000, stock: 75 },
        { size: '50ml', price: 2900000, salePrice: 2700000, stock: 45 },
      ],
    },
    {
      name: 'Jo Malone Wood Sage - Unisex',
      sku: 'JM-WOOD-SAGE',
      description: 'Hương gỗ xô thơm tươi mát, thanh lịch cho cả nam và nữ',
      variants: [
        { size: '5ml', price: 490000, salePrice: 440000, stock: 92 },
        { size: '20ml', price: 1300000, salePrice: 1200000, stock: 70 },
        { size: '50ml', price: 2700000, salePrice: 2500000, stock: 42 },
      ],
    },
    {
      name: 'Byredo Gypsy Water - Unisex',
      sku: 'BYREDO-GYPSY',
      description: 'Hương thơm tự do, phóng khoáng phù hợp với cả nam và nữ',
      variants: [
        { size: '5ml', price: 560000, salePrice: 510000, stock: 88 },
        { size: '20ml', price: 1450000, salePrice: 1350000, stock: 68 },
        { size: '50ml', price: 3000000, salePrice: 2800000, stock: 40 },
      ],
    },
    {
      name: 'Le Labo Santal 33 - Unisex',
      sku: 'LELABO-SANTAL33',
      description: 'Hương gỗ đàn hương đặc trưng, sang trọng cho mọi giới tính',
      variants: [
        { size: '5ml', price: 580000, salePrice: 530000, stock: 85 },
        { size: '20ml', price: 1500000, salePrice: 1400000, stock: 65 },
        { size: '50ml', price: 3100000, salePrice: 2900000, stock: 38 },
      ],
    },
  ],
};

async function main() {
  console.log('🌱 Starting product seed by category...');

  // Get categories
  const categoryNam = await prisma.category.findUnique({
    where: { slug: 'nam' },
  });
  const categoryNu = await prisma.category.findUnique({
    where: { slug: 'nu' },
  });
  const categoryUnisex = await prisma.category.findUnique({
    where: { slug: 'unisex' },
  });

  if (!categoryNam || !categoryNu || !categoryUnisex) {
    console.error('❌ Categories not found! Please ensure Nam, Nữ, and Unisex categories exist.');
    return;
  }

  console.log('✅ Found categories:');
  console.log(`   - Nam: ${categoryNam.id}`);
  console.log(`   - Nữ: ${categoryNu.id}`);
  console.log(`   - Unisex: ${categoryUnisex.id}`);

  // Create products for Nam category
  console.log('\n📦 Creating products for Nam category...');
  for (const productData of productsByCategory.nam) {
    const { variants, ...productInfo } = productData;

    const product = await prisma.product.upsert({
      where: { sku: productInfo.sku },
      update: {},
      create: {
        ...productInfo,
        slug: productInfo.sku.toLowerCase(),
        status: 'PUBLISHED',
        categoryId: categoryNam.id,
      },
    });

    // Create variants
    for (const variantData of variants) {
      const variantSku = `${product.sku}-${variantData.size}`;
      await prisma.productVariant.upsert({
        where: { sku: variantSku },
        update: {},
        create: {
          productId: product.id,
          ...variantData,
          sku: variantSku,
          active: true,
        },
      });
    }

    console.log(`   ✅ Created: ${product.name} with ${variants.length} variants`);
  }

  // Create products for Nữ category
  console.log('\n📦 Creating products for Nữ category...');
  for (const productData of productsByCategory.nu) {
    const { variants, ...productInfo } = productData;

    const product = await prisma.product.upsert({
      where: { sku: productInfo.sku },
      update: {},
      create: {
        ...productInfo,
        slug: productInfo.sku.toLowerCase(),
        status: 'PUBLISHED',
        categoryId: categoryNu.id,
      },
    });

    // Create variants
    for (const variantData of variants) {
      const variantSku = `${product.sku}-${variantData.size}`;
      await prisma.productVariant.upsert({
        where: { sku: variantSku },
        update: {},
        create: {
          productId: product.id,
          ...variantData,
          sku: variantSku,
          active: true,
        },
      });
    }

    console.log(`   ✅ Created: ${product.name} with ${variants.length} variants`);
  }

  // Create products for Unisex category
  console.log('\n📦 Creating products for Unisex category...');
  for (const productData of productsByCategory.unisex) {
    const { variants, ...productInfo } = productData;

    const product = await prisma.product.upsert({
      where: { sku: productInfo.sku },
      update: {},
      create: {
        ...productInfo,
        slug: productInfo.sku.toLowerCase(),
        status: 'PUBLISHED',
        categoryId: categoryUnisex.id,
      },
    });

    // Create variants
    for (const variantData of variants) {
      const variantSku = `${product.sku}-${variantData.size}`;
      await prisma.productVariant.upsert({
        where: { sku: variantSku },
        update: {},
        create: {
          productId: product.id,
          ...variantData,
          sku: variantSku,
          active: true,
        },
      });
    }

    console.log(`   ✅ Created: ${product.name} with ${variants.length} variants`);
  }

  console.log('\n🎉 Product seed completed successfully!');
  console.log(`📦 Total products created:`);
  console.log(`   - Nam: ${productsByCategory.nam.length} products`);
  console.log(`   - Nữ: ${productsByCategory.nu.length} products`);
  console.log(`   - Unisex: ${productsByCategory.unisex.length} products`);
}

main()
  .catch((e) => {
    console.error('❌ Product seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
