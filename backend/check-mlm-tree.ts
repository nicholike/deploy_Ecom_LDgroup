import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Check MLM tree structure
 * Shows the tree hierarchy for a given user
 */
async function checkMLMTree() {
  try {
    const username = process.argv[2] || 'dieplaif1';

    console.log(`\n🌳 MLM Tree for: ${username}\n`);
    console.log('='.repeat(80));

    // Find root user
    const rootUser = await prisma.user.findUnique({
      where: { username },
    });

    if (!rootUser) {
      console.log('❌ User not found');
      return;
    }

    console.log(`\n📋 Root User: ${rootUser.username} (${rootUser.role})`);

    // Get all descendants from UserTree
    const treeEntries = await prisma.userTree.findMany({
      where: {
        ancestor: rootUser.id,
      },
      orderBy: [
        { level: 'asc' },
        { descendant: 'asc' },
      ],
    });

    // Get user details for all descendants
    const descendantIds = treeEntries.map(e => e.descendant);
    const users = await prisma.user.findMany({
      where: {
        id: { in: descendantIds },
      },
      include: {
        sponsor: {
          select: {
            username: true,
            role: true,
          },
        },
      },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    // Group by level
    const byLevel = new Map<number, typeof treeEntries>();
    for (const entry of treeEntries) {
      if (!byLevel.has(entry.level)) {
        byLevel.set(entry.level, []);
      }
      byLevel.get(entry.level)!.push(entry);
    }

    // Display tree by level
    console.log(`\n🌲 Tree Structure (${treeEntries.length} total entries):\n`);

    for (const [level, entries] of Array.from(byLevel.entries()).sort((a, b) => a[0] - b[0])) {
      console.log(`${'  '.repeat(level)}Level ${level}: ${entries.length} ${level === 0 ? '(self)' : `user${entries.length > 1 ? 's' : ''}`}`);

      for (const entry of entries) {
        const user = userMap.get(entry.descendant);
        if (!user) continue;

        const indent = '  '.repeat(level + 1);
        const isSelf = entry.level === 0;
        const sponsorInfo = user.sponsor
          ? `(sponsor: ${user.sponsor.username} ${user.sponsor.role})`
          : '(no sponsor)';

        console.log(`${indent}├─ ${user.username} [${user.role}] ${isSelf ? '(ROOT)' : sponsorInfo}`);
      }
      console.log('');
    }

    // Check for orphaned users (in database but not in tree)
    const allUsers = await prisma.user.findMany({
      where: {
        sponsorId: rootUser.id,
      },
      select: {
        id: true,
        username: true,
        role: true,
      },
    });

    const usersInTree = new Set(treeEntries.filter(e => e.level === 1).map(e => e.descendant));
    const orphaned = allUsers.filter(u => !usersInTree.has(u.id));

    if (orphaned.length > 0) {
      console.log(`\n⚠️  WARNING: Found ${orphaned.length} orphaned user(s) (in DB but not in tree):`);
      for (const user of orphaned) {
        console.log(`   - ${user.username} (${user.role})`);
      }
      console.log('\n   These users need tree rebuild!');
    } else {
      console.log(`\n✅ No orphaned users found. Tree is consistent.`);
    }

    // Summary
    console.log(`\n📊 Summary:`);
    console.log(`   Root: ${rootUser.username} (${rootUser.role})`);
    console.log(`   Total tree entries: ${treeEntries.length}`);
    console.log(`   Max depth: ${Math.max(...Array.from(byLevel.keys()))}`);
    console.log(`   Direct children (Level 1): ${byLevel.get(1)?.length || 0}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMLMTree();
