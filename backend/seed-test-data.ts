import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Seed test data for commission testing
 * Creates:
 * - F1, F2, F3, F4 users
 * - Orders for each user
 * - Auto-calculate commissions
 */
async function seedTestData() {
  try {
    console.log('\n🌱 Seeding test data...\n');
    console.log('='.repeat(80));

    // 1. Find admin
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      orderBy: { createdAt: 'asc' },
    });

    if (!admin) {
      console.log('❌ Admin not found!');
      return;
    }

    console.log(`\n✅ Admin: ${admin.username} (${admin.referralCode})\n`);

    // 2. Create test users
    const password = 'password123'; // Default password
    const passwordHash = await bcrypt.hash(password, 10);

    const users = [
      {
        username: 'testf1',
        email: 'testf1@test.com',
        firstName: 'Test',
        lastName: 'F1',
        role: 'F1' as any,
        referralCode: 'TESTF1',
        sponsorId: admin.id,
      },
      {
        username: 'testf2',
        email: 'testf2@test.com',
        firstName: 'Test',
        lastName: 'F2',
        role: 'F2' as any,
        referralCode: 'TESTF2',
        sponsorId: null as any, // Will be set to testf1's ID
      },
      {
        username: 'testf3',
        email: 'testf3@test.com',
        firstName: 'Test',
        lastName: 'F3',
        role: 'F3' as any,
        referralCode: 'TESTF3',
        sponsorId: null as any, // Will be set to testf2's ID
      },
      {
        username: 'testf4',
        email: 'testf4@test.com',
        firstName: 'Test',
        lastName: 'F4',
        role: 'F4' as any,
        referralCode: 'TESTF4',
        sponsorId: null as any, // Will be set to testf3's ID
      },
    ];

    console.log('👥 Creating users...\n');

    const createdUsers: any[] = [];

    for (let i = 0; i < users.length; i++) {
      const userData = users[i];

      // Set sponsorId based on previous user
      if (i > 0) {
        userData.sponsorId = createdUsers[i - 1].id;
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          ...userData,
          passwordHash,
          status: 'ACTIVE' as any, // Already approved
          emailVerified: true,
          quotaLimit: 300,
          quotaUsed: 0,
        },
      });

      createdUsers.push(user);

      console.log(`   ✅ Created: ${user.username} (${user.role})`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Password: ${password}`);
      console.log(`      Referral Code: ${user.referralCode}`);
      console.log(`      Sponsor: ${i === 0 ? admin.username : users[i - 1].username}\n`);

      // Create wallet
      await prisma.wallet.create({
        data: {
          userId: user.id,
          balance: 0,
        },
      });

      // Create UserTree entries
      // Self-reference
      await prisma.userTree.create({
        data: {
          ancestor: user.id,
          descendant: user.id,
          level: 0,
        },
      });

      // Link to all ancestors
      const ancestorTrees = await prisma.userTree.findMany({
        where: { descendant: userData.sponsorId! },
      });

      for (const ancestorTree of ancestorTrees) {
        await prisma.userTree.create({
          data: {
            ancestor: ancestorTree.ancestor,
            descendant: user.id,
            level: ancestorTree.level + 1,
          },
        }).catch(() => {}); // Ignore duplicates
      }
    }

    console.log('\n🌳 MLM Tree structure:');
    console.log(`   ${admin.username} (ADMIN)`);
    console.log(`   └─ testf1 (F1)`);
    console.log(`      └─ testf2 (F2)`);
    console.log(`         └─ testf3 (F3)`);
    console.log(`            └─ testf4 (F4)\n`);

    // 3. Get products for orders
    const products = await prisma.product.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    if (products.length === 0) {
      console.log('⚠️  No products found. Skipping order creation.');
      console.log('   Import products first, then run this script again.\n');
      return;
    }

    console.log(`\n📦 Found ${products.length} products for orders\n`);

    // 4. Create orders for each user
    console.log('🛒 Creating orders...\n');

    const orderAmounts = [
      { username: 'testf1', amount: 2000000 }, // 2M
      { username: 'testf2', amount: 1500000 }, // 1.5M
      { username: 'testf3', amount: 3000000 }, // 3M
      { username: 'testf4', amount: 5000000 }, // 5M
    ];

    for (const orderData of orderAmounts) {
      const user = createdUsers.find(u => u.username === orderData.username);
      if (!user) continue;

      // Create order
      const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
      const order = await prisma.order.create({
        data: {
          userId: user.id,
          orderNumber,
          subtotal: orderData.amount,
          totalAmount: orderData.amount,
          status: 'COMPLETED' as any, // ⭐ COMPLETED to trigger commission
          paymentMethod: 'BANK_TRANSFER' as any,
          shippingAddress: {
            fullName: `${user.firstName} ${user.lastName}`,
            phone: '0123456789',
            address: '123 Test Street',
            ward: 'Test Ward',
            district: 'Test District',
            province: 'Test Province',
          } as any,
          items: {
            create: [
              {
                productId: products[0].id,
                productVariantId: null,
                variantSize: null,
                quantity: 1,
                price: orderData.amount,
                subtotal: orderData.amount,
              },
            ],
          },
        },
      });

      console.log(`   ✅ Order #${order.id.substring(0, 8)} for ${user.username}`);
      console.log(`      Amount: ${orderData.amount.toLocaleString('vi-VN')} VND`);
      console.log(`      Status: ${order.status}\n`);
    }

    // 5. Manually trigger commission calculation
    console.log('💰 Calculating commissions...\n');

    // We need to call the commission service here
    // For now, let's just show what should happen
    console.log('⚠️  Commission auto-calculation requires Order service.');
    console.log('   You can trigger it by:');
    console.log('   1. Admin Panel → Orders → Update status to COMPLETED');
    console.log('   2. Or call POST /orders/{orderId}/complete endpoint\n');

    // Print summary
    console.log('\n✅ Test data seeded successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Users created: ${createdUsers.length}`);
    console.log(`   Wallets created: ${createdUsers.length}`);
    console.log(`   Orders created: ${orderAmounts.length}`);
    console.log(`   Default password: ${password}\n`);

    console.log('🧪 Test login:');
    console.log(`   Username: testf1, testf2, testf3, testf4`);
    console.log(`   Password: ${password}\n`);

    console.log('🎯 Next steps:');
    console.log('   1. Check wallets: npx ts-node check-mlm-tree.ts testf1');
    console.log('   2. Trigger commissions via Admin Panel');
    console.log('   3. Check balances after commission distribution\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestData();
