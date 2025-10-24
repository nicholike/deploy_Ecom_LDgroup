import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function createSampleOrder() {
  try {
    console.log('🔍 Finding user and products...');

    // Get first regular user (not admin)
    const user = await prisma.user.findFirst({
      where: {
        role: {
          not: UserRole.ADMIN,
        },
      },
    });

    if (!user) {
      console.error('❌ No regular user found');
      return;
    }

    console.log(`✅ Found user: ${user.username} (${user.id})`);

    // Get products with 20ml variants
    const products = await prisma.product.findMany({
      where: {
        isSpecial: false,
        variants: {
          some: {
            size: '20ml',
            active: true,
          },
        },
      },
      include: {
        variants: {
          where: {
            size: '20ml',
            active: true,
          },
        },
      },
      take: 3, // Get 3 products
    });

    if (products.length < 2) {
      console.error('❌ Not enough products with 20ml variants');
      return;
    }

    console.log(`✅ Found ${products.length} products with 20ml variants`);

    // Generate order number
    const orderNumber = `ORD${Date.now().toString().slice(-8)}`;

    console.log(`\n📦 Creating order ${orderNumber}...`);

    // Calculate prices (use simple pricing for demo)
    const product1 = products[0];
    const variant1 = product1.variants[0];
    const qty1 = 20; // 20 chai 20ml -> được tặng 2 chai
    const price1 = 330000; // Price tier for 20+ bottles
    const subtotal1 = qty1 * price1;

    const product2 = products[1]; // Free gift product 1
    const variant2 = product2.variants[0];
    const qtyGift1 = 1;

    const hasSecondGift = products.length >= 3;
    const product3 = hasSecondGift ? products[2] : null;
    const variant3 = product3 ? product3.variants[0] : null;
    const qtyGift2 = 1;

    const totalAmount = subtotal1; // Only paid items count

    console.log(`\n💰 Order details:`);
    console.log(`  - ${product1.name} (${variant1.size}): ${qty1} chai × ${price1.toLocaleString()}đ = ${subtotal1.toLocaleString()}đ`);
    console.log(`  - 🎁 ${product2.name} (${variant2.size}): ${qtyGift1} chai × MIỄN PHÍ`);
    if (hasSecondGift && product3 && variant3) {
      console.log(`  - 🎁 ${product3.name} (${variant3.size}): ${qtyGift2} chai × MIỄN PHÍ`);
    }
    console.log(`  - Tổng: ${totalAmount.toLocaleString()}đ\n`);

    // Create order
    const orderItems: any[] = [
      {
        productId: product1.id,
        productVariantId: variant1.id,
        variantSize: variant1.size,
        quantity: qty1,
        price: price1,
        subtotal: subtotal1,
        isFreeGift: false,
      },
      {
        productId: product2.id,
        productVariantId: variant2.id,
        variantSize: variant2.size,
        quantity: qtyGift1,
        price: 0,
        subtotal: 0,
        isFreeGift: true, // 🎁 Free gift!
      },
    ];

    if (hasSecondGift && product3 && variant3) {
      orderItems.push({
        productId: product3.id,
        productVariantId: variant3.id,
        variantSize: variant3.size,
        quantity: qtyGift2,
        price: 0,
        subtotal: 0,
        isFreeGift: true, // 🎁 Free gift!
      });
    }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: user.id,
        subtotal: subtotal1,
        shippingFee: 0,
        tax: 0,
        discount: 0,
        totalAmount,
        status: 'CONFIRMED',
        paymentStatus: 'COMPLETED',
        paymentMethod: 'BANK_TRANSFER',
        shippingMethod: 'STANDARD',
        shippingAddress: {
          name: 'Nguyễn Văn A',
          phone: '0123456789',
          address: '123 Nguyễn Huệ',
          ward: 'Phường Bến Nghé',
          district: 'Quận 1',
          city: 'TP. Hồ Chí Minh',
        },
        customerNote: 'Đơn hàng test có sản phẩm tặng kèm',
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
      },
    });

    console.log(`✅ Order created successfully!`);
    console.log(`\n📋 Order Summary:`);
    console.log(`   Order Number: ${order.orderNumber}`);
    console.log(`   User: ${user.username}`);
    console.log(`   Total Items: ${order.items.length}`);
    console.log(`   Total Amount: ${order.totalAmount.toLocaleString()}đ`);
    console.log(`\n🎁 Free Gifts:`);
    order.items
      .filter((item) => item.isFreeGift)
      .forEach((item) => {
        console.log(`   - ${item.product.name} (${item.variantSize}): ${item.quantity} chai`);
      });

    console.log(`\n🎉 Done! Check admin panel to see the order with free gifts highlighted in green!`);
    console.log(`   Order ID: ${order.id}`);
    console.log(`   Order Number: ${order.orderNumber}`);
  } catch (error) {
    console.error('❌ Error creating sample order:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleOrder();
