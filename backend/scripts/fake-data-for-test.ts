import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'dieplaif1@gmail.com';

  console.log(`🔍 Finding user: ${email}`);
  const user = await prisma.user.findUnique({
    where: { email },
    include: { downline: true }
  });

  if (!user) {
    throw new Error(`User ${email} not found!`);
  }

  console.log(`✅ Found user: ${user.username} (${user.id})`);

  // Get some products for fake orders
  const products = await prisma.product.findMany({
    take: 10,
    include: { variants: true }
  });

  if (products.length === 0) {
    throw new Error('No products found! Please import products first.');
  }

  console.log(`📦 Found ${products.length} products`);

  // ==========================================
  // 1. FAKE WITHDRAWAL REQUESTS (30 records)
  // ==========================================
  console.log('\n💰 Creating 30 withdrawal requests...');
  const withdrawalStatuses: Array<'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED'> = ['PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED'];

  for (let i = 0; i < 30; i++) {
    const status = withdrawalStatuses[Math.floor(Math.random() * withdrawalStatuses.length)];
    const amount = Math.floor(Math.random() * 5000000) + 500000; // 500k - 5.5M
    const daysAgo = Math.floor(Math.random() * 90); // Random within last 90 days

    await prisma.withdrawalRequest.create({
      data: {
        userId: user.id,
        amount,
        status: status as any,
        bankInfo: {
          bankName: 'Vietcombank',
          accountNumber: '1234567890',
          accountName: 'DIEP LAI',
          branch: 'TP.HCM'
        },
        requestedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        userNote: status === 'COMPLETED' ? `Rút tiền lần ${i + 1}` : undefined,
        processedAt: ['APPROVED', 'REJECTED', 'COMPLETED'].includes(status)
          ? new Date(Date.now() - (daysAgo - 1) * 24 * 60 * 60 * 1000)
          : undefined,
        completedAt: status === 'COMPLETED'
          ? new Date(Date.now() - (daysAgo - 2) * 24 * 60 * 60 * 1000)
          : undefined,
      }
    });
  }
  console.log('✅ Created 30 withdrawal requests');

  // ==========================================
  // 2. FAKE ORDERS FOR USER (30 records)
  // ==========================================
  console.log('\n📦 Creating 30 orders for user...');
  const orderStatuses: Array<'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'DELIVERED'> = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'DELIVERED'];
  const paymentStatuses: Array<'PENDING' | 'PROCESSING' | 'COMPLETED'> = ['PENDING', 'PROCESSING', 'COMPLETED'];

  for (let i = 0; i < 30; i++) {
    const orderStatus = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
    const paymentStatus = orderStatus === 'PENDING' ? 'PENDING' as const : paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
    const daysAgo = Math.floor(Math.random() * 60); // Random within last 60 days

    // Select random products
    const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items per order
    const selectedProducts = [];
    for (let j = 0; j < numItems; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      selectedProducts.push(product);
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = selectedProducts.map(product => {
      const quantity = [10, 100][Math.floor(Math.random() * 2)];
      let price = 0;
      let variantId = null;
      let variantSize = null;

      if (product.variants && product.variants.length > 0) {
        const variant = product.variants[Math.floor(Math.random() * product.variants.length)];
        price = Number(variant.salePrice || variant.price);
        variantId = variant.id;
        variantSize = variant.size;
      } else {
        price = Number(product.salePrice || product.price || 100000);
      }

      const itemSubtotal = price * quantity;
      subtotal += itemSubtotal;

      return {
        productId: product.id,
        productVariantId: variantId,
        variantSize,
        quantity,
        price,
        subtotal: itemSubtotal
      };
    });

    const totalAmount = subtotal;

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD${Date.now()}${i}`,
        userId: user.id,
        subtotal,
        totalAmount,
        status: orderStatus as any,
        paymentStatus: paymentStatus as any,
        shippingAddress: {
          name: 'Diep Lai',
          phone: '0123456789',
          address: '123 Nguyen Hue',
          city: 'TP.HCM',
          district: 'Quan 1',
          ward: 'Phuong Ben Nghe'
        },
        shippingMethod: 'STANDARD',
        paymentMethod: 'BANK_TRANSFER',
        createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        paidAt: paymentStatus === 'COMPLETED'
          ? new Date(Date.now() - (daysAgo - 1) * 24 * 60 * 60 * 1000)
          : undefined,
        completedAt: orderStatus === 'COMPLETED' || orderStatus === 'DELIVERED'
          ? new Date(Date.now() - (daysAgo - 3) * 24 * 60 * 60 * 1000)
          : undefined,
      }
    });

    // Create order items
    for (const item of orderItems) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          productVariantId: item.productVariantId,
          variantSize: item.variantSize,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal
        }
      });
    }
  }
  console.log('✅ Created 30 orders for user');

  // ==========================================
  // 3. FAKE DOWNLINE USERS IF NEEDED
  // ==========================================
  console.log('\n👥 Checking downline users...');
  let downlineUsers = user.downline;

  if (downlineUsers.length === 0) {
    console.log('📝 Creating 5 downline users...');
    for (let i = 0; i < 5; i++) {
      const downlineUser = await prisma.user.create({
        data: {
          email: `downline${i + 1}_${Date.now()}@test.com`,
          username: `downline${i + 1}_${Date.now()}`,
          passwordHash: '$2a$10$dummy.hash.for.testing.purposes.only',
          firstName: `Downline`,
          lastName: `User ${i + 1}`,
          role: 'F2',
          sponsorId: user.id,
          referralCode: `REF${Date.now()}${i}`,
          status: 'ACTIVE',
          emailVerified: true,
        }
      });
      downlineUsers.push(downlineUser);

      // Create user tree entries
      await prisma.userTree.create({
        data: {
          ancestor: user.id,
          descendant: downlineUser.id,
          level: 1
        }
      });
      await prisma.userTree.create({
        data: {
          ancestor: downlineUser.id,
          descendant: downlineUser.id,
          level: 0
        }
      });
    }
    console.log('✅ Created 5 downline users');
  } else {
    console.log(`✅ Found ${downlineUsers.length} existing downline users`);
  }

  // ==========================================
  // 4. FAKE ORDERS FOR DOWNLINE (30 records)
  // ==========================================
  console.log('\n📦 Creating 30 orders for downline users...');

  for (let i = 0; i < 30; i++) {
    const downlineUser = downlineUsers[Math.floor(Math.random() * downlineUsers.length)];
    const orderStatus = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
    const paymentStatus = orderStatus === 'PENDING' ? 'PENDING' as const : paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
    const daysAgo = Math.floor(Math.random() * 60);

    // Select random products
    const numItems = Math.floor(Math.random() * 3) + 1;
    const selectedProducts = [];
    for (let j = 0; j < numItems; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      selectedProducts.push(product);
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = selectedProducts.map(product => {
      const quantity = [10, 100][Math.floor(Math.random() * 2)];
      let price = 0;
      let variantId = null;
      let variantSize = null;

      if (product.variants && product.variants.length > 0) {
        const variant = product.variants[Math.floor(Math.random() * product.variants.length)];
        price = Number(variant.salePrice || variant.price);
        variantId = variant.id;
        variantSize = variant.size;
      } else {
        price = Number(product.salePrice || product.price || 100000);
      }

      const itemSubtotal = price * quantity;
      subtotal += itemSubtotal;

      return {
        productId: product.id,
        productVariantId: variantId,
        variantSize,
        quantity,
        price,
        subtotal: itemSubtotal
      };
    });

    const totalAmount = subtotal;

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber: `DL${Date.now()}${i}`,
        userId: downlineUser.id,
        subtotal,
        totalAmount,
        status: orderStatus as any,
        paymentStatus: paymentStatus as any,
        shippingAddress: {
          name: `${downlineUser.firstName} ${downlineUser.lastName}`,
          phone: '0987654321',
          address: '456 Le Loi',
          city: 'TP.HCM',
          district: 'Quan 3',
          ward: 'Phuong 1'
        },
        shippingMethod: 'STANDARD',
        paymentMethod: 'BANK_TRANSFER',
        createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        paidAt: paymentStatus === 'COMPLETED'
          ? new Date(Date.now() - (daysAgo - 1) * 24 * 60 * 60 * 1000)
          : undefined,
        completedAt: orderStatus === 'COMPLETED' || orderStatus === 'DELIVERED'
          ? new Date(Date.now() - (daysAgo - 3) * 24 * 60 * 60 * 1000)
          : undefined,
      }
    });

    // Create order items
    for (const item of orderItems) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          productVariantId: item.productVariantId,
          variantSize: item.variantSize,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal
        }
      });
    }
  }
  console.log('✅ Created 30 orders for downline users');

  console.log('\n🎉 FAKE DATA CREATED SUCCESSFULLY!');
  console.log(`
📊 Summary:
- User: ${user.email}
- Withdrawal Requests: 30
- Own Orders: 30
- Downline Users: ${downlineUsers.length}
- Downline Orders: 30
`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
