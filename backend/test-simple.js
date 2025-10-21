const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = 'your-secret-key-change-this-in-production';
const userId = '4b2bffa9-5e8d-4369-aba0-052f9b1e5d7d';

async function test() {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
  
  const fetch = (await import('node-fetch')).default;
  const res = await fetch('http://localhost:3000/api/v1/cart', {
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    }
  });

  const data = await res.json();
  
  console.log('=== CART API RESPONSE ===');
  if (data.items) {
    for (const item of data.items) {
      if (item.product && item.product.isSpecial) {
        console.log('Special Product:', item.product.name);
        console.log('  Quantity:', item.quantity);
        console.log('  specialPrice:', item.specialPrice);
        console.log('  Expected:', '650000 x', item.quantity, '=', 650000 * item.quantity);
      }
    }
  } else {
    console.log(JSON.stringify(data, null, 2));
  }

  await prisma.$disconnect();
}

test();
