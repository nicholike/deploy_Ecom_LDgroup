import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addBalance() {
  try {
    // Get username and amount from command line arguments
    const username = process.argv[2];
    const amount = parseFloat(process.argv[3] || '500000');

    if (!username) {
      console.log('❌ Usage: npx ts-node add-balance.ts <username> [amount]');
      console.log('Example: npx ts-node add-balance.ts dieplaif4 500000');
      console.log('\n📋 Available users:');
      const users = await prisma.user.findMany({
        select: { username: true, email: true, role: true },
        orderBy: { username: 'asc' }
      });
      users.forEach(u => console.log(`  - ${u.username} (${u.email}) - ${u.role}`));
      return;
    }

    console.log(`\n🔍 Tìm user: ${username}`);

    // 1. Find user
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        wallet: true
      }
    });

    if (!user) {
      console.log(`❌ User "${username}" không tìm thấy`);
      console.log('\n📋 Available users:');
      const users = await prisma.user.findMany({
        select: { username: true, email: true, role: true },
        orderBy: { username: 'asc' }
      });
      users.forEach(u => console.log(`  - ${u.username} (${u.email}) - ${u.role}`));
      return;
    }

    const currentBalance = user.wallet?.balance ? Number(user.wallet.balance) : 0;

    console.log('✅ Found user:', {
      username: user.username,
      email: user.email,
      role: user.role,
      currentBalance: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(currentBalance)
    });

    // 2. Add balance to wallet
    const newBalance = currentBalance + amount;

    const wallet = await prisma.wallet.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        balance: amount,
      },
      update: {
        balance: newBalance,
      },
    });

    console.log('\n💰 Wallet updated:');
    console.log(`  Old balance: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(currentBalance)}`);
    console.log(`  Added:       ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}`);
    console.log(`  New balance: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(wallet.balance))}`);

    console.log(`\n✅ Done! Bây giờ bạn có thể test chuyển nhánh:`);
    console.log(`   - Vào admin panel → Users → Tìm "${username}"`);
    console.log(`   - Click "Sửa" → Chọn sponsor mới`);
    console.log(`   - Nếu ví > 0 → Sẽ báo lỗi ❌`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addBalance();
