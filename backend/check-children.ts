import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkChildren() {
  try {
    // Tìm dieplaif2_3
    const sponsor = await prisma.user.findFirst({
      where: {
        username: 'dieplaif2_3',
      },
    });

    if (!sponsor) {
      console.log('❌ Sponsor không tìm thấy');
      return;
    }

    console.log('📋 Sponsor Info:');
    console.log('Username:', sponsor.username);
    console.log('Role:', sponsor.role);
    console.log('ID:', sponsor.id);

    // Tìm tất cả con của dieplaif2_3
    const children = await prisma.user.findMany({
      where: {
        sponsorId: sponsor.id,
      },
      include: {
        sponsor: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`\n👶 Con của ${sponsor.username} (${children.length} users):\n`);

    for (const child of children) {
      console.log(`\n- Username: ${child.username}`);
      console.log(`  Role: ${child.role}`);
      console.log(`  Email: ${child.email}`);
      console.log(`  Sponsor Username: ${child.sponsor?.username || 'N/A'}`);
      console.log(`  Sponsor Role: ${child.sponsor?.role || 'N/A'}`);
      console.log(`  ---`);
    }

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkChildren();
