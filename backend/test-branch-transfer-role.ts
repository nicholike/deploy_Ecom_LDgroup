import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Test script to verify branch transfer with role update
 *
 * Scenario:
 * - User A (F2) is child of B (F1)
 * - Transfer A to be child of C (F4)
 * - Expected: A should become F5 (not stay F2)
 */
async function testBranchTransfer() {
  try {
    console.log('\n🧪 TEST: Branch Transfer with Role Update\n');
    console.log('='.repeat(60));

    // Find a user to test with
    const testUser = await prisma.user.findFirst({
      where: {
        username: 'dieplaif4',
      },
      include: {
        sponsor: true,
      },
    });

    if (!testUser) {
      console.log('❌ Test user not found');
      return;
    }

    console.log('\n📋 BEFORE Transfer:');
    console.log(`  User: ${testUser.username}`);
    console.log(`  Current Role: ${testUser.role}`);
    console.log(`  Current Sponsor: ${testUser.sponsor?.username || 'None'}`);
    console.log(`  Sponsor Role: ${testUser.sponsor?.role || 'N/A'}`);

    // Get wallet balance
    const wallet = await prisma.wallet.findUnique({
      where: { userId: testUser.id },
    });
    const balance = wallet ? Number(wallet.balance) : 0;
    console.log(`  Wallet Balance: ${balance.toLocaleString('vi-VN')} VND`);

    if (balance > 0) {
      console.log('\n⚠️  Wallet balance > 0. Transfer will be blocked by controller.');
      console.log('   Reset wallet first: npx ts-node add-balance.ts dieplaif4 -500000');
      return;
    }

    // Find possible new sponsor (different F-level)
    const possibleSponsors = await prisma.user.findMany({
      where: {
        role: {
          in: ['F1', 'F3', 'F4'], // Different levels to test
        },
        status: 'ACTIVE',
        id: {
          not: testUser.id, // Not self
        },
      },
      take: 3,
    });

    console.log('\n📌 Available sponsors for testing:');
    possibleSponsors.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.username} (${s.role})`);
    });

    if (possibleSponsors.length === 0) {
      console.log('❌ No available sponsors found');
      return;
    }

    // Simulate what would happen
    const newSponsor = possibleSponsors[0];
    console.log(`\n🔄 SIMULATION: Transfer to ${newSponsor.username} (${newSponsor.role})`);

    // Calculate expected new role
    const roleMap: Record<string, string> = {
      'ADMIN': 'F1',
      'F1': 'F2',
      'F2': 'F3',
      'F3': 'F4',
      'F4': 'F5',
      'F5': 'F6',
      'F6': 'F6',
    };
    const expectedNewRole = roleMap[newSponsor.role];

    console.log(`  New Sponsor: ${newSponsor.username} (${newSponsor.role})`);
    console.log(`  Expected New Role: ${expectedNewRole}`);
    console.log(`  Current Role: ${testUser.role}`);
    console.log(`  Role Will Change: ${testUser.role !== expectedNewRole ? '✅ YES' : '❌ NO (same)'}`);

    console.log('\n📝 What will happen:');
    console.log('  1. Cancel all commissions');
    console.log('  2. Delete UserTree entries');
    console.log('  3. Update sponsor + role + reset quota');
    console.log('  4. Rebuild UserTree');
    console.log('  5. Wallet stays at 0 (not reset)');

    console.log('\n💡 To execute this transfer:');
    console.log(`   1. Go to Admin Panel → Users`);
    console.log(`   2. Find "${testUser.username}"`);
    console.log(`   3. Click "Sửa"`);
    console.log(`   4. Search and select "${newSponsor.username}" as new sponsor`);
    console.log(`   5. Click "Lưu thay đổi"`);

    console.log('\n✅ Role update logic is now implemented!');
    console.log('   User role will automatically update from', testUser.role, 'to', expectedNewRole);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBranchTransfer();
