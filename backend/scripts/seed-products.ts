import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const perfumeProducts = [
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
    name: 'Tom Ford Black Orchid - Hương Hoa Lan Huyền Bí',
    sku: 'TF-BLACK-ORCHID',
    description: 'Hương thơm huyền bí, sang trọng với note hoa lan đen',
    variants: [
      { size: '5ml', price: 550000, salePrice: 500000, stock: 100 },
      { size: '20ml', price: 1400000, salePrice: 1300000, stock: 75 },
      { size: '50ml', price: 2900000, salePrice: 2700000, stock: 45 },
    ],
  },
  {
    name: 'Yves Saint Laurent Mon Paris - Hương Ngọt Ngào',
    sku: 'YSL-MON-PARIS',
    description: 'Nước hoa nữ với hương ngọt ngào, lãng mạn của Paris',
    variants: [
      { size: '5ml', price: 470000, salePrice: 420000, stock: 115 },
      { size: '20ml', price: 1250000, salePrice: 1150000, stock: 88 },
      { size: '50ml', price: 2600000, salePrice: 2400000, stock: 58 },
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
    name: 'Lancôme La Vie Est Belle - Hương Hạnh Phúc',
    sku: 'LANCOME-LVEB',
    description: 'Nước hoa nữ mang hương thơm của hạnh phúc và niềm vui',
    variants: [
      { size: '5ml', price: 460000, salePrice: 410000, stock: 108 },
      { size: '20ml', price: 1220000, salePrice: 1120000, stock: 86 },
      { size: '50ml', price: 2550000, salePrice: 2350000, stock: 56 },
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
];

async function main() {
  console.log('🌱 Starting product seed...');

  // Get or create perfume category
  let perfumeCategory = await prisma.category.findUnique({
    where: { slug: 'nuoc-hoa-cao-cap' },
  });

  if (!perfumeCategory) {
    perfumeCategory = await prisma.category.create({
      data: {
        name: 'Nước Hoa Cao Cấp',
        slug: 'nuoc-hoa-cao-cap',
        description: 'Nước hoa chính hãng từ các thương hiệu nổi tiếng thế giới',
        order: 1,
        active: true,
      },
    });
    console.log('✅ Created perfume category');
  }

  // Create products
  for (const productData of perfumeProducts) {
    const { variants, ...productInfo } = productData;

    const product = await prisma.product.upsert({
      where: { sku: productInfo.sku },
      update: {},
      create: {
        ...productInfo,
        slug: productInfo.sku.toLowerCase(),
        status: 'PUBLISHED',
        categoryId: perfumeCategory.id,
      },
    });

    // Create variants
    for (const variantData of variants) {
      const variantSku = `${product.sku}-${variantData.size}`;
      await prisma.productVariant.upsert({
        where: {
          sku: variantSku,
        },
        update: {},
        create: {
          productId: product.id,
          ...variantData,
          sku: variantSku,
          active: true,
        },
      });
    }

    console.log(`✅ Created product: ${product.name} with ${variants.length} variants`);
  }

  console.log('🎉 Product seed completed successfully!');
  console.log(`📦 Created ${perfumeProducts.length} products`);
}

main()
  .catch((e) => {
    console.error('❌ Product seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
