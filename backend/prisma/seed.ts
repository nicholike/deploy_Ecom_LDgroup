import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Hash password
  const passwordHash = await bcrypt.hash('Admin@123456', 10);

  // Create Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@mlm.com' },
    update: {},
    create: {
      email: 'admin@mlm.com',
      username: 'admin',
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      phone: '+84901000000',
      role: 'ADMIN',
      referralCode: 'ADMIN001',
      emailVerified: true,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Created admin user:', admin.email);

  // Create Commission Configs
  const commissionConfigs = [
    { level: 1, commissionRate: 10.0 },
    { level: 2, commissionRate: 7.0 },
    { level: 3, commissionRate: 5.0 },
    { level: 4, commissionRate: 3.0 },
  ];

  for (const config of commissionConfigs) {
    await prisma.commissionConfig.upsert({
      where: { level: config.level },
      update: {},
      create: {
        level: config.level,
        commissionRate: config.commissionRate,
        commissionType: 'PERCENTAGE',
        active: true,
      },
    });
  }

  console.log('✅ Created commission configs');

  // Create sample categories
  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and gadgets',
      order: 1,
      active: true,
    },
  });

  const fashion = await prisma.category.upsert({
    where: { slug: 'fashion' },
    update: {},
    create: {
      name: 'Fashion',
      slug: 'fashion',
      description: 'Clothing and accessories',
      order: 2,
      active: true,
    },
  });

  console.log('✅ Created categories');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
