import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testOrderAPI() {
  const orderId = '79db2c89-b27a-4ff5-8404-06500ddf981c';

  console.log('📥 Fetching order from database...\n');

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: true,
          productVariant: true,
        },
      },
    },
  });

  if (!order) {
    console.error('❌ Order not found');
    return;
  }

  console.log(`✅ Order: ${order.orderNumber}\n`);
  console.log('📦 Items:');

  order.items.forEach((item, index) => {
    console.log(`\n${index + 1}. ${item.product.name}`);
    console.log(`   - Quantity: ${item.quantity}`);
    console.log(`   - Price: ${item.price}`);
    console.log(`   - Subtotal: ${item.subtotal}`);
    console.log(`   - isFreeGift: ${item.isFreeGift} ✨`);
  });

  console.log('\n\n🔍 Full order object (for debugging):');
  console.log(JSON.stringify({
    orderNumber: order.orderNumber,
    items: order.items.map(item => ({
      id: item.id,
      productName: item.product.name,
      quantity: item.quantity,
      price: item.price.toString(),
      subtotal: item.subtotal.toString(),
      isFreeGift: item.isFreeGift, // Check if this field exists
    }))
  }, null, 2));

  await prisma.$disconnect();
}

testOrderAPI();
