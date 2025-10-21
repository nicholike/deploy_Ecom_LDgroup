import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCartSpecial() {
  console.log('=== CHECKING CART WITH SPECIAL PRODUCTS ===\n');
  
  // Find carts with special products
  const carts = await prisma.cart.findMany({
    include: {
      items: {
        include: {
          product: true,
          productVariant: true,
        },
      },
    },
  });

  for (const cart of carts) {
    const specialItems = cart.items.filter(item => item.product.isSpecial);
    
    if (specialItems.length > 0) {
      console.log(`Cart ID: ${cart.id}`);
      console.log(`User ID: ${cart.userId}\n`);
      
      for (const item of specialItems) {
        console.log('SPECIAL PRODUCT CART ITEM:');
        console.log(`  Product: ${item.product.name}`);
        console.log(`  Product ID: ${item.productId}`);
        console.log(`  Quantity: ${item.quantity}`);
        console.log(`  Product Variant ID: ${item.productVariantId}`);
        console.log('');
        
        console.log('PRODUCT LEVEL PRICES:');
        console.log(`  product.price: ${item.product.price}`);
        console.log(`  product.salePrice: ${item.product.salePrice}`);
        console.log('');
        
        if (item.productVariant) {
          console.log('VARIANT LEVEL PRICES:');
          console.log(`  variant.size: ${item.productVariant.size}`);
          console.log(`  variant.price: ${item.productVariant.price}`);
          console.log(`  variant.salePrice: ${item.productVariant.salePrice}`);
          console.log('');
          
          // Test logic
          let pricePerUnit = 0;
          pricePerUnit = Number(item.productVariant.salePrice || item.productVariant.price || 0);
          
          if (pricePerUnit === 0) {
            pricePerUnit = Number(item.product.salePrice || item.product.price || 0);
          }
          
          const specialPrice = pricePerUnit * item.quantity;
          
          console.log('CALCULATED:');
          console.log(`  Price per unit: ${pricePerUnit}`);
          console.log(`  Special price (qty ${item.quantity}): ${specialPrice}`);
        } else {
          console.log('VARIANT: null - no variant attached!');
        }
        console.log('\n---\n');
      }
    }
  }

  await prisma.$disconnect();
}

checkCartSpecial();
