import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProductVariants() {
  try {
    const product = await prisma.product.findFirst({
      where: {
        name: {
          contains: 'TESTER',
        },
      },
      include: {
        variants: true,
      },
    });

    console.log('📦 Product with Variants:');
    console.log(JSON.stringify(product, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductVariants();
