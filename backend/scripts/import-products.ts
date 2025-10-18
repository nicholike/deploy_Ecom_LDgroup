import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface CSVRow {
  name: string;
  sku: string;
  category: string;
  price5ml: string;
  price20ml: string;
}

function parseCSV(filePath: string): CSVRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  // Skip header
  const dataLines = lines.slice(1);
  
  return dataLines.map(line => {
    // Split by comma but be careful with commas inside quoted fields
    const parts = line.split(',');
    return {
      name: parts[0]?.trim() || '',
      sku: parts[1]?.trim() || '',
      category: parts[2]?.trim() || '',
      price5ml: parts[3]?.trim() || '',
      price20ml: parts[4]?.trim() || '',
    };
  });
}

function parsePriceTiers(priceStr: string): { minQuantity: number; maxQuantity: number | null; price: number }[] {
  if (!priceStr) return [];
  
  // Format: "10 sp: 99.000 | 100 sp: 89.000"
  // Note: 99.000 in Vietnamese format = 99,000 VND (using . as thousands separator)
  const tiers = priceStr.split('|').map(t => t.trim());
  
  return tiers.map((tier, index) => {
    const match = tier.match(/(\d+)\s*sp:\s*([\d.]+)/);
    if (!match) return null;
    
    const quantity = parseInt(match[1]);
    // Remove dots (thousands separator) to get the actual number
    // 99.000 -> 99000 VND
    const price = parseFloat(match[2].replace(/\./g, ''));
    
    return {
      minQuantity: quantity,
      maxQuantity: index < tiers.length - 1 ? parseInt(tiers[index + 1].match(/(\d+)\s*sp:/)?.[1] || '0') - 1 : null,
      price,
    };
  }).filter(Boolean) as any;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  console.log('🚀 Starting product import...\n');

  try {
    // 1. Delete all existing products and related data
    console.log('🗑️  Deleting existing products...');
    
    // Delete in correct order to avoid foreign key constraints
    await prisma.orderItem.deleteMany({});
    console.log('   ✓ Deleted order items');
    
    await prisma.cartItem.deleteMany({});
    console.log('   ✓ Deleted cart items');
    
    await prisma.productVariant.deleteMany({});
    console.log('   ✓ Deleted product variants');
    
    await prisma.product.deleteMany({});
    console.log('   ✓ Deleted all products\n');

    // 2. Ensure categories exist
    console.log('📁 Ensuring categories exist...');
    
    const categories = ['Nam', 'Nữ', 'Tester'];
    const categoryMap = new Map<string, string>();
    
    for (const catName of categories) {
      let category = await prisma.category.findFirst({
        where: { name: catName },
      });
      
      if (!category) {
        category = await prisma.category.create({
          data: {
            name: catName,
            slug: generateSlug(catName),
            description: `Sản phẩm ${catName}`,
            active: true,
          },
        });
        console.log(`   ✓ Created category: ${catName}`);
      } else {
        console.log(`   ✓ Category exists: ${catName}`);
      }
      
      categoryMap.set(catName, category.id);
    }
    console.log('');

    // 3. Read and parse CSV
    const csvPath = path.join(__dirname, '../../list_product_updated.csv');
    console.log(`📖 Reading CSV from: ${csvPath}`);
    
    const rows = parseCSV(csvPath);
    console.log(`   Found ${rows.length} products\n`);

    // 4. Import products
    console.log('📦 Importing products...\n');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const row of rows) {
      try {
        const categoryId = categoryMap.get(row.category);

        if (!categoryId) {
          console.log(`   ⚠️  Skipping ${row.name}: Unknown category "${row.category}"`);
          errorCount++;
          continue;
        }

        // Check if this is Tester product (no 5ml price, only 1 variant)
        const isTester = row.category === 'Tester' || (!row.price5ml && row.price20ml && row.price20ml.includes('1 sp:'));

        // Create product
        const product = await prisma.product.create({
          data: {
            name: row.name,
            slug: generateSlug(row.name),
            description: `${row.name} - ${row.category}`,
            sku: row.sku,
            categoryId,
            status: 'PUBLISHED',
            stock: 999999,
            isCommissionEligible: !isTester, // Tester products are not commission eligible
            isSpecial: isTester,
            lowStockThreshold: 10,
            images: [],
          },
        });

        // Create variants
        if (isTester) {
          // Tester: single variant without size specification
          const priceTiers = parsePriceTiers(row.price20ml);

          if (priceTiers.length > 0) {
            const basePrice = priceTiers[0].price;

            await prisma.productVariant.create({
              data: {
                productId: product.id,
                size: 'Standard', // No specific size for tester
                sku: row.sku,
                price: basePrice,
                stock: 999999,
                active: true,
                priceTiers: {
                  create: priceTiers.map(tier => ({
                    minQuantity: tier.minQuantity,
                    maxQuantity: tier.maxQuantity,
                    price: tier.price,
                  })),
                },
              },
            });
          }
          console.log(`   ✓ ${row.name} (${row.sku}) - ${row.category} - TESTER PRODUCT`);
        } else {
          // Regular products: 5ml and 20ml variants
          const sizes = ['5ml', '20ml'];
          const priceData = [row.price5ml, row.price20ml];

          for (let i = 0; i < sizes.length; i++) {
            const size = sizes[i];
            const priceTiers = parsePriceTiers(priceData[i]);

            if (priceTiers.length > 0) {
              const basePrice = priceTiers[0].price;

              await prisma.productVariant.create({
                data: {
                  productId: product.id,
                  size,
                  sku: `${row.sku}-${size.toUpperCase()}`,
                  price: basePrice,
                  stock: 999999,
                  active: true,
                  priceTiers: {
                    create: priceTiers.map(tier => ({
                      minQuantity: tier.minQuantity,
                      maxQuantity: tier.maxQuantity,
                      price: tier.price,
                    })),
                  },
                },
              });
            }
          }
          console.log(`   ✓ ${row.name} (${row.sku}) - ${row.category} - with 5ml & 20ml variants`);
        }
        
        successCount++;
      } catch (error) {
        console.error(`   ✗ Error importing ${row.name}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n✅ Import completed!');
    console.log(`   Success: ${successCount} products`);
    console.log(`   Errors: ${errorCount} products`);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

