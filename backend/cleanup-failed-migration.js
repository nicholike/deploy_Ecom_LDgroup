/**
 * Cleanup script to remove failed migration record from Railway database
 *
 * Run this ONCE on production to fix the migration issue:
 * railway run node cleanup-failed-migration.js
 */

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Checking for failed migration...');

    // Delete the failed migration record from _prisma_migrations table
    const result = await prisma.$executeRawUnsafe(`
      DELETE FROM _prisma_migrations
      WHERE migration_name = '20250207090000_update_user_role_enum'
    `);

    console.log(`✅ Deleted ${result} failed migration record(s)`);
    console.log('✅ Migration cleanup complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Redeploy your backend on Railway');
    console.log('2. Prisma will no longer try to apply the failed migration');

  } catch (error) {
    console.error('❌ Error cleaning up migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
