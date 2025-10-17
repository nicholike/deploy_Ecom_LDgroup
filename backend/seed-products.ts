import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Hàm tạo slug từ tên
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Tạo Categories
  console.log('\n📁 Creating categories...');

  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'nam' },
      update: {},
      create: {
        name: 'Nam',
        slug: 'nam',
        description: 'Nước hoa dành cho nam giới',
        order: 1,
        active: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'nu' },
      update: {},
      create: {
        name: 'Nữ',
        slug: 'nu',
        description: 'Nước hoa dành cho nữ giới',
        order: 2,
        active: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'unisex' },
      update: {},
      create: {
        name: 'Unisex',
        slug: 'unisex',
        description: 'Nước hoa unisex cho cả nam và nữ',
        order: 3,
        active: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'doc-ban' },
      update: {},
      create: {
        name: 'Độc bản',
        slug: 'doc-ban',
        description: 'Nước hoa độc bản, phiên bản giới hạn',
        order: 4,
        active: true,
      },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories`);

  // 2. Tạo Products với Variants
  console.log('\n🎁 Creating products with variants...');

  const products = [
    // Nam (7 products)
    { name: 'Dior Sauvage Elixir', category: 'nam', price: 150000, description: 'Hương thơm nam tính mạnh mẽ với gỗ đàn hương và gia vị' },
    { name: 'Bleu de Chanel Parfum', category: 'nam', price: 145000, description: 'Hương thơm sang trọng, lịch lãm cho quý ông' },
    { name: 'Acqua Di Gio Profondo', category: 'nam', price: 130000, description: 'Hương biển cả tươi mát, năng động' },
    { name: 'Tom Ford Oud Wood', category: 'nam', price: 180000, description: 'Hương gỗ trầm ấm áp, quý phái' },
    { name: 'Versace Eros Flame', category: 'nam', price: 125000, description: 'Hương cam chanh nồng nàn, cuốn hút' },
    { name: 'Paco Rabanne 1 Million', category: 'nam', price: 140000, description: 'Hương thơm ngọt ngào, quyến rũ' },
    { name: 'Jean Paul Gaultier Le Male', category: 'nam', price: 135000, description: 'Hương lavender và vani nam tính' },

    // Nữ (7 products)
    { name: 'Chanel No.5 Eau de Parfum', category: 'nu', price: 160000, description: 'Hương hoa hồng cổ điển, thanh lịch' },
    { name: 'Dior J\'adore Infinissime', category: 'nu', price: 155000, description: 'Hương hoa nhài ngọt ngào, quyến rũ' },
    { name: 'YSL Black Opium', category: 'nu', price: 145000, description: 'Hương cà phê và vani ngọt ngào' },
    { name: 'Lancome La Vie Est Belle', category: 'nu', price: 150000, description: 'Hương hoa iris ngọt ngào, tươi tắn' },
    { name: 'Viktor & Rolf Flowerbomb', category: 'nu', price: 165000, description: 'Hương hoa cỏ nồng nàn, gợi cảm' },
    { name: 'Gucci Bloom Ambrosia', category: 'nu', path: 'nu', price: 148000, description: 'Hương hoa tươi mát, thanh lịch' },
    { name: 'Marc Jacobs Daisy Love', category: 'nu', price: 135000, description: 'Hương hoa cúc ngọt ngào, nhẹ nhàng' },

    // Unisex (4 products)
    { name: 'Jo Malone Wood Sage & Sea Salt', category: 'unisex', price: 170000, description: 'Hương biển cả tươi mát, unisex' },
    { name: 'Byredo Bal d\'Afrique', category: 'unisex', price: 175000, description: 'Hương hoa và gỗ ấm áp, độc đáo' },
    { name: 'Le Labo Santal 33', category: 'unisex', price: 190000, description: 'Hương gỗ đàn hương đặc trưng' },
    { name: 'Maison Margiela Replica Jazz Club', category: 'unisex', price: 165000, description: 'Hương thuốc lá và rượu rum ấm áp' },

    // Độc bản (2 products)
    { name: 'Creed Aventus Limited Edition', category: 'doc-ban', price: 250000, description: 'Phiên bản giới hạn của Aventus huyền thoại' },
    { name: 'Roja Parfums Enigma Pour Homme', category: 'doc-ban', price: 280000, description: 'Nước hoa xa xỉ, độc bản cho nam' },
  ];

  let productCount = 0;
  let variantCount = 0;
  let tierCount = 0;

  for (const productData of products) {
    const category = categories.find((c) => c.slug === productData.category);
    if (!category) continue;

    // Tạo product
    const product = await prisma.product.create({
      data: {
        name: productData.name,
        slug: createSlug(productData.name),
        description: productData.description,
        categoryId: category.id,
        status: 'PUBLISHED',
        isCommissionEligible: true,
      },
    });

    productCount++;

    // Tạo 3 variants cho mỗi sản phẩm: 5ml, 20ml, 50ml
    const variants = [
      { size: '5ml', priceMultiplier: 1.0, stock: 100 },
      { size: '20ml', priceMultiplier: 3.5, stock: 50 },
      { size: '50ml', priceMultiplier: 7.5, stock: 30 },
    ];

    for (let i = 0; i < variants.length; i++) {
      const variantData = variants[i];
      const basePrice = productData.price;
      const variantPrice = Math.round(basePrice * variantData.priceMultiplier);

      const variant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          size: variantData.size,
          sku: `${createSlug(productData.name).toUpperCase()}-${variantData.size}`.substring(0, 50),
          price: variantPrice,
          costPrice: Math.round(variantPrice * 0.6), // 60% of price
          stock: variantData.stock,
          lowStockThreshold: 10,
          isDefault: i === 0, // First variant is default
          order: i,
          active: true,
        },
      });

      variantCount++;

      // Tạo price tiers cho mỗi variant
      const priceTiers = [
        { minQty: 1, maxQty: 9, discount: 0 },
        { minQty: 10, maxQty: 49, discount: 0.05, label: 'Mua 10-49: Giảm 5%' },
        { minQty: 50, maxQty: 99, discount: 0.10, label: 'Mua 50-99: Giảm 10%' },
        { minQty: 100, maxQty: null, discount: 0.15, label: 'Mua 100+: Giảm 15%' },
      ];

      for (const tier of priceTiers) {
        await prisma.priceTier.create({
          data: {
            productVariantId: variant.id,
            minQuantity: tier.minQty,
            maxQuantity: tier.maxQty ?? undefined,
            price: Math.round(variantPrice * (1 - tier.discount)),
            label: tier.label || undefined,
            order: tier.minQty,
          },
        });
        tierCount++;
      }
    }
  }

  console.log(`✅ Created ${productCount} products`);
  console.log(`✅ Created ${variantCount} product variants`);
  console.log(`✅ Created ${tierCount} price tiers`);

  console.log('\n🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
