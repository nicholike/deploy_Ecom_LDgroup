import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Trigger commission calculation for COMPLETED orders
 */
async function triggerCommissions() {
  try {
    console.log('\n💰 Triggering commission calculation...\n');
    console.log('='.repeat(80));

    // 1. Get all COMPLETED orders without commissions
    const orders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
      },
      include: {
        user: {
          include: {
            sponsor: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`\n📦 Found ${orders.length} COMPLETED orders\n`);

    if (orders.length === 0) {
      console.log('No orders to process.');
      return;
    }

    // Commission rates
    const COMMISSION_RATES: Record<number, number> = {
      1: 10.0,  // Direct upline: 10%
      2: 4.0,   // 2nd level upline: 4%
      3: 2.0,   // 3rd level upline: 2%
    };

    // 2. Process each order
    for (const order of orders) {
      console.log(`\n📋 Order #${order.orderNumber}`);
      console.log(`   Buyer: ${order.user.username} (${order.user.role})`);
      console.log(`   Amount: ${Number(order.totalAmount).toLocaleString('vi-VN')} VND\n`);

      // Check if commissions already exist
      const existingCommissions = await prisma.commission.findMany({
        where: { orderId: order.id },
      });

      if (existingCommissions.length > 0) {
        console.log(`   ⚠️  Commissions already exist (${existingCommissions.length}). Skipping...`);
        continue;
      }

      // Get upline chain (max 3 levels)
      const uplineChain: any[] = [];
      let currentSponsorId = order.user.sponsorId;

      for (let level = 1; level <= 3; level++) {
        if (!currentSponsorId) break;

        const sponsor = await prisma.user.findUnique({
          where: { id: currentSponsorId },
        });

        if (!sponsor) break;

        uplineChain.push(sponsor);
        currentSponsorId = sponsor.sponsorId;
      }

      if (uplineChain.length === 0) {
        console.log('   ℹ️  No upline found. No commissions to distribute.');
        continue;
      }

      console.log(`   👥 Upline chain: ${uplineChain.length} level(s)`);

      // Get current period (YYYY-MM)
      const now = new Date();
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // 3. Create commissions for each upline
      for (let level = 1; level <= uplineChain.length; level++) {
        const uplineUser = uplineChain[level - 1];
        const rate = COMMISSION_RATES[level] || 0;

        if (rate === 0) continue;

        const commissionAmount = (Number(order.totalAmount) * rate) / 100;

        console.log(`   Level ${level}: ${uplineUser.username} (${uplineUser.role}) - ${rate}% = ${commissionAmount.toLocaleString('vi-VN')} VND`);

        // Create commission
        await prisma.commission.create({
          data: {
            userId: uplineUser.id,
            orderId: order.id,
            fromUserId: order.userId,
            level,
            orderValue: order.totalAmount,
            commissionRate: rate,
            commissionAmount,
            period,
            status: 'APPROVED', // Auto approved
          },
        });

        // Add to wallet
        await prisma.wallet.upsert({
          where: { userId: uplineUser.id },
          create: {
            userId: uplineUser.id,
            balance: commissionAmount,
          },
          update: {
            balance: {
              increment: commissionAmount,
            },
          },
        });

        console.log(`      ✅ Commission credited to wallet`);
      }

      console.log(`\n   ✅ Commissions distributed successfully!`);
    }

    // 4. Show final wallet balances
    console.log('\n\n💰 Final Wallet Balances:\n');
    console.log('='.repeat(80));

    const wallets = await prisma.wallet.findMany({
      include: {
        user: true,
      },
      where: {
        user: {
          role: {
            not: 'ADMIN',
          },
        },
      },
      orderBy: {
        user: {
          username: 'asc',
        },
      },
    });

    for (const wallet of wallets) {
      const balance = Number(wallet.balance);
      console.log(`   ${wallet.user.username.padEnd(10)} (${wallet.user.role}): ${balance.toLocaleString('vi-VN').padStart(15)} VND`);
    }

    console.log('\n✅ Commission calculation complete!\n');

    // Summary
    const totalCommissions = await prisma.commission.aggregate({
      _sum: {
        commissionAmount: true,
      },
      _count: true,
    });

    console.log('📊 Summary:');
    console.log(`   Orders processed: ${orders.length}`);
    console.log(`   Commissions created: ${totalCommissions._count}`);
    console.log(`   Total commissions: ${Number(totalCommissions._sum.commissionAmount || 0).toLocaleString('vi-VN')} VND\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

triggerCommissions();
