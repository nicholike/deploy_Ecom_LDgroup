const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetOrdersAndWallets() {
  console.log('🗑️  Starting cleanup: Orders, Commissions, and Wallets...');

  try {
    // Delete in correct order to respect foreign key constraints

    // 1. Delete commissions first (references orders)
    const deletedCommissions = await prisma.commission.deleteMany({});
    console.log(`✅ Deleted ${deletedCommissions.count} commissions`);

    // 2. Delete order items (references orders)
    const deletedOrderItems = await prisma.orderItem.deleteMany({});
    console.log(`✅ Deleted ${deletedOrderItems.count} order items`);

    // 3. Delete orders
    const deletedOrders = await prisma.order.deleteMany({});
    console.log(`✅ Deleted ${deletedOrders.count} orders`);

    // 4. Delete wallet transactions
    const deletedWalletTxs = await prisma.walletTransaction.deleteMany({});
    console.log(`✅ Deleted ${deletedWalletTxs.count} wallet transactions`);

    // 5. Reset all wallet balances to 0
    const updatedWallets = await prisma.wallet.updateMany({
      data: { balance: 0 },
    });
    console.log(`✅ Reset ${updatedWallets.count} wallet balances to 0`);

    // 6. Delete bank transactions (SePay webhook data)
    const deletedBankTxs = await prisma.bankTransaction.deleteMany({});
    console.log(`✅ Deleted ${deletedBankTxs.count} bank transactions`);

    // 7. Reset user quota (optional - set quotaUsed back to 0)
    const updatedUsers = await prisma.user.updateMany({
      where: {
        quotaUsed: { gt: 0 },
      },
      data: {
        quotaUsed: 0,
      },
    });
    console.log(`✅ Reset quota for ${updatedUsers.count} users`);

    console.log('\n✅ Cleanup completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Commissions: ${deletedCommissions.count}`);
    console.log(`   - Order Items: ${deletedOrderItems.count}`);
    console.log(`   - Orders: ${deletedOrders.count}`);
    console.log(`   - Wallet Transactions: ${deletedWalletTxs.count}`);
    console.log(`   - Wallets Reset: ${updatedWallets.count}`);
    console.log(`   - Bank Transactions: ${deletedBankTxs.count}`);
    console.log(`   - Users Quota Reset: ${updatedUsers.count}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
resetOrdersAndWallets()
  .then(() => {
    console.log('\n🎉 Ready for fresh testing!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to reset database:', error);
    process.exit(1);
  });
