import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSpecialProducts() {
  console.log('Checking special products...\n');
  
  const specialProducts = await prisma.product.findMany({
    where: { isSpecial: true },
    include: {
      variants: true,
    },
  });

  console.log(`Found ${specialProducts.length} special product(s):\n`);

  for (const product of specialProducts) {
    console.log(`Product: ${product.name}`);
    console.log(`  ID: ${product.id}`);
    console.log(`  isSpecial: ${product.isSpecial}`);
    console.log(`  Product.price: ${product.price}`);
    console.log(`  Product.salePrice: ${product.salePrice}`);
    console.log(`  Variants:`);
    
    for (const variant of product.variants) {
      console.log(`    - ${variant.size}: price=${variant.price}, salePrice=${variant.salePrice}, sku=${variant.sku}`);
    }
    console.log('');
  }

  await prisma.$disconnect();
}

checkSpecialProducts();
