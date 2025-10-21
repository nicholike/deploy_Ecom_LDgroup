/**
 * Test script to verify UpdateGlobalPricingDto works with string literal keys
 */

import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

// Mock the DTO class inline
class PriceTierDto {
  tier100: number;
  tier10: number;
  single: number;
}

class UpdateGlobalPricingDto {
  '5ml': PriceTierDto;
  '20ml': PriceTierDto;
}

async function testDto() {
  console.log('🧪 Testing DTO with string literal keys...\n');

  // Test case 1: Valid data
  const validData = {
    '5ml': { tier100: 99000, tier10: 109000, single: 139000 },
    '20ml': { tier100: 330000, tier10: 360000, single: 450000 },
  };

  console.log('📥 Input data:');
  console.log(JSON.stringify(validData, null, 2));
  console.log('\n🔄 Transforming to DTO...');

  const dto = plainToClass(UpdateGlobalPricingDto, validData);

  console.log('📤 Transformed DTO:');
  console.log(dto);
  console.log('\n🔍 Accessing properties:');
  console.log('dto["5ml"]:', dto['5ml']);
  console.log('dto["20ml"]:', dto['20ml']);

  console.log('\n✅ Validation...');
  const errors = await validate(dto);

  if (errors.length > 0) {
    console.log('❌ Validation errors:');
    errors.forEach(err => {
      console.log(`  - ${err.property}:`, Object.values(err.constraints || {}));
    });
  } else {
    console.log('✅ No validation errors!');
  }

  // Test case 2: Test that we can access the data correctly
  console.log('\n🎯 Final check:');
  if (dto['5ml'] && dto['5ml'].tier100 === 99000) {
    console.log('✅ Can access 5ml.tier100 correctly:', dto['5ml'].tier100);
  } else {
    console.log('❌ Cannot access 5ml.tier100');
  }

  if (dto['20ml'] && dto['20ml'].tier100 === 330000) {
    console.log('✅ Can access 20ml.tier100 correctly:', dto['20ml'].tier100);
  } else {
    console.log('❌ Cannot access 20ml.tier100');
  }
}

testDto().catch(console.error);
