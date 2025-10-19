import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      take: 3,
      include: {
        sponsor: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    console.log('\n📊 Users in database:');
    console.log('Total count:', await prisma.user.count());
    console.log('\n📝 Sample users:');

    users.forEach((user, index) => {
      console.log(`\n${index + 1}. User:`, {
        id: user.id,
        email: user.email,
        username: user.username,
        referralCode: user.referralCode || '❌ MISSING',
        sponsorId: user.sponsorId || '❌ MISSING',
        sponsor: user.sponsor ? {
          username: user.sponsor.username,
          name: `${user.sponsor.firstName || ''} ${user.sponsor.lastName || ''}`.trim()
        } : '❌ MISSING',
        role: user.role,
        status: user.status,
      });
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
