const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = '3bjY/GGGV6HEdJNwxUBEszAoMvg1/d1xIKcMlouFkdE=';
const userId = '4b2bffa9-5e8d-4369-aba0-052f9b1e5d7d';

async function test() {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.log('User not found');
    await prisma.$disconnect();
    return;
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  const fetch = (await import('node-fetch')).default;
  const res = await fetch('http://localhost:3000/api/v1/cart', {
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    }
  });

  const data = await res.json();
  
  console.log('=== CART API RESPONSE ===\n');
  
  if (data && data.items && data.items.length > 0) {
    console.log('Total items:', data.items.length);
    console.log('Total price:', data.totalPrice);
    console.log('');
    
    for (const item of data.items) {
      if (item.product && item.product.isSpecial) {
        console.log('SPECIAL PRODUCT:');
        console.log('  Name:', item.product.name);
        console.log('  Quantity:', item.quantity);
        console.log('  specialPrice from API:', item.specialPrice);
        console.log('  Expected (650000 x ' + item.quantity + '):', 650000 * item.quantity);
        console.log('');
        
        if (item.specialPrice === 650000 * item.quantity) {
          console.log('✅ PRICE IS CORRECT!');
        } else {
          console.log('❌ PRICE IS WRONG!');
          console.log('   Got:', item.specialPrice);
          console.log('   Expected:', 650000 * item.quantity);
        }
      }
    }
  } else {
    console.log('Full response:');
    console.log(JSON.stringify(data, null, 2));
  }

  await prisma.$disconnect();
}

test().catch(console.error);
