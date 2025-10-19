import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetWallet() {
  try {
    const username = process.argv[2];

    if (!username) {
      console.log('❌ Usage: npx ts-node reset-wallet.ts <username>');
      console.log('Example: npx ts-node reset-wallet.ts dieplaif4');
      return;
    }

    console.log(`\n🔍 Tìm user: ${username}`);

    const user = await prisma.user.findUnique({
      where: { username },
      include: { wallet: true },
    });

    if (!user) {
      console.log(`❌ User "${username}" không tìm thấy`);
      return;
    }

    const currentBalance = user.wallet?.balance ? Number(user.wallet.balance) : 0;

    console.log('✅ Found user:', {
      username: user.username,
      email: user.email,
      role: user.role,
      currentBalance: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(currentBalance),
    });

    // Reset wallet to 0
    await prisma.wallet.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        balance: 0,
      },
      update: {
        balance: 0,
      },
    });

    console.log('\n💰 Wallet reset:');
    console.log(`  Old balance: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(currentBalance)}`);
    console.log(`  New balance: 0 ₫`);

    console.log(`\n✅ Done! Bây giờ có thể chuyển nhánh cho "${username}"`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetWallet();
