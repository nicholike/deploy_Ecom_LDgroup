import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CryptoUtil } from '@shared/utils/crypto.util';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'dieptrungnam123@gmail.com';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Lai712004!';

async function main() {
  console.log('🔐 Creating admin account…');

  const existingByEmail = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL.toLowerCase() },
  });

  if (existingByEmail) {
    console.log(`ℹ️  Admin with email ${ADMIN_EMAIL} already exists (id: ${existingByEmail.id}). Updating password…`);
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        passwordHash,
        role: UserRole.ADMIN,
        status: 'ACTIVE',
      },
    });
    console.log('✅ Password updated successfully.');
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const referralCode = await generateUniqueReferralCode();

  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL.toLowerCase(),
      username: ADMIN_USERNAME,
      passwordHash,
      role: UserRole.ADMIN,
      status: 'ACTIVE',
      emailVerified: true,
      referralCode,
    },
  });

  await prisma.userTree.create({
    data: {
      ancestor: admin.id,
      descendant: admin.id,
      level: 0,
    },
  });

  console.log('✅ Admin user created successfully:');
  console.log(`   ID: ${admin.id}`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Username: ${admin.username}`);
  console.log(`   Referral code: ${admin.referralCode}`);
}

async function generateUniqueReferralCode(): Promise<string> {
  while (true) {
    const candidate = CryptoUtil.generateReferralCode('ADM');
    const exists = await prisma.user.findUnique({
      where: { referralCode: candidate },
    });
    if (!exists) {
      return candidate;
    }
  }
}

main()
  .catch((error) => {
    console.error('❌ Failed to create admin user:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
