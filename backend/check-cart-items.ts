import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCartItems() {
  try {
    // Find cart items with TESTER product
    const cartItems = await prisma.cartItem.findMany({
      where: {
        product: {
          name: {
            contains: 'TESTER',
          },
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            salePrice: true,
            isSpecial: true,
          },
        },
        productVariant: {
          select: {
            id: true,
            size: true,
            price: true,
            salePrice: true,
          },
        },
      },
    });

    console.log('🛒 Cart Items with TESTER product:');
    console.log(JSON.stringify(cartItems, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCartItems();
