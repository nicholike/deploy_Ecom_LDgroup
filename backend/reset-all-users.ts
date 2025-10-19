import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * ⚠️ DANGER: Reset all users and wallets
 * Keeps ADMIN account only
 */
async function resetAllUsers() {
  try {
    console.log('\n🚨 WARNING: This will delete ALL users except ADMIN!');
    console.log('='.repeat(80));

    // Find admin account
    const admin = await prisma.user.findFirst({
      where: {
        role: 'ADMIN',
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!admin) {
      console.log('❌ No admin account found! Aborting...');
      return;
    }

    console.log(`\n✅ Found admin: ${admin.username} (${admin.email})`);
    console.log(`   This account will be KEPT.\n`);

    // Count current data
    const counts = {
      users: await prisma.user.count({ where: { role: { not: 'ADMIN' } } }),
      wallets: await prisma.wallet.count(),
      commissions: await prisma.commission.count(),
      orders: await prisma.order.count(),
      userTrees: await prisma.userTree.count(),
      withdrawals: await prisma.withdrawalRequest.count(),
      pendingOrders: await prisma.pendingOrder.count(),
    };

    console.log('📊 Current data:');
    console.log(`   Users (non-admin): ${counts.users}`);
    console.log(`   Wallets: ${counts.wallets}`);
    console.log(`   Commissions: ${counts.commissions}`);
    console.log(`   Orders: ${counts.orders}`);
    console.log(`   Pending Orders: ${counts.pendingOrders}`);
    console.log(`   UserTree entries: ${counts.userTrees}`);
    console.log(`   Withdrawals: ${counts.withdrawals}`);

    console.log('\n⚠️  Starting deletion in 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Delete in correct order (respect foreign keys)
    console.log('\n🗑️  Deleting data...\n');

    // 1. Delete UserTree entries
    console.log('1. Deleting UserTree entries...');
    await prisma.userTree.deleteMany({});
    console.log('   ✅ Done');

    // 2. Delete Commissions
    console.log('2. Deleting Commissions...');
    await prisma.commission.deleteMany({});
    console.log('   ✅ Done');

    // 3. Delete Withdrawals
    console.log('3. Deleting Withdrawals...');
    await prisma.withdrawalRequest.deleteMany({});
    console.log('   ✅ Done');

    // 4. Delete Pending Orders
    console.log('4. Deleting Pending Orders...');
    await prisma.pendingOrder.deleteMany({});
    console.log('   ✅ Done');

    // 5. Delete Orders (keep for admin tracking? or delete?)
    console.log('5. Deleting Orders...');
    await prisma.order.deleteMany({
      where: {
        userId: { not: admin.id },
      },
    });
    console.log('   ✅ Done');

    // 6. Delete Wallets
    console.log('6. Deleting Wallets...');
    await prisma.wallet.deleteMany({
      where: {
        userId: { not: admin.id },
      },
    });
    console.log('   ✅ Done');

    // 7. Delete Bank Transactions
    console.log('7. Deleting Bank Transactions...');
    await prisma.bankTransaction.deleteMany({});
    console.log('   ✅ Done');

    // 8. Delete Users (except admin)
    console.log('8. Deleting Users (except admin)...');
    await prisma.user.deleteMany({
      where: {
        role: { not: 'ADMIN' },
      },
    });
    console.log('   ✅ Done');

    // 9. Reset admin's UserTree (self-reference only)
    console.log('9. Rebuilding admin UserTree...');
    await prisma.userTree.create({
      data: {
        ancestor: admin.id,
        descendant: admin.id,
        level: 0,
      },
    }).catch(() => {}); // Ignore if exists
    console.log('   ✅ Done');

    // 10. Reset admin wallet to 0 (or keep?)
    console.log('10. Resetting admin wallet...');
    await prisma.wallet.upsert({
      where: { userId: admin.id },
      create: {
        userId: admin.id,
        balance: 0,
      },
      update: {
        balance: 0,
      },
    });
    console.log('   ✅ Done');

    console.log('\n✅ All data deleted successfully!');
    console.log('\n📋 Remaining:');
    console.log(`   Admin: ${admin.username} (${admin.email})`);
    console.log(`   Products: ${await prisma.product.count()} (unchanged)`);
    console.log(`   Categories: ${await prisma.category.count()} (unchanged)`);

    console.log('\n🎯 You can now:');
    console.log('   1. Register new users via frontend');
    console.log('   2. Admin approves them');
    console.log('   3. Test MLM tree, commissions, etc.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

console.log('\n⚠️  ARE YOU SURE YOU WANT TO DELETE ALL USER DATA?');
console.log('   This will delete:');
console.log('   - All users (except admin)');
console.log('   - All wallets');
console.log('   - All commissions');
console.log('   - All orders');
console.log('   - All MLM tree data');
console.log('\nType CTRL+C to cancel, or wait 5 seconds to proceed...\n');

setTimeout(() => {
  resetAllUsers();
}, 5000);
