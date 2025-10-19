import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSponsorRole() {
  try {
    // Tìm user có username chứa "dieplaif2_3F1"
    const user = await prisma.user.findFirst({
      where: {
        username: {
          contains: 'dieplaif2_3',
        },
      },
      include: {
        sponsor: true,
      },
    });

    if (!user) {
      console.log('❌ User không tìm thấy');
      return;
    }

    console.log('\n📋 Thông tin User:');
    console.log('Username:', user.username);
    console.log('Role:', user.role);
    console.log('Email:', user.email);
    console.log('ID:', user.id);

    if (user.sponsor) {
      console.log('\n👤 Thông tin Sponsor:');
      console.log('Username:', user.sponsor.username);
      console.log('Role:', user.sponsor.role);
      console.log('Email:', user.sponsor.email);
      console.log('ID:', user.sponsor.id);
    } else {
      console.log('\n❌ User không có sponsor');
    }

    // Tìm tất cả users có username giống nhau để check
    const allMatches = await prisma.user.findMany({
      where: {
        username: {
          contains: 'dieplaif2_3',
        },
      },
      include: {
        sponsor: true,
      },
    });

    console.log('\n🔍 Tất cả users tìm được:');
    for (const u of allMatches) {
      console.log(`\n- Username: ${u.username}`);
      console.log(`  Role: ${u.role}`);
      console.log(`  Sponsor: ${u.sponsor?.username || 'Không có'} (Role: ${u.sponsor?.role || 'N/A'})`);
    }

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSponsorRole();
