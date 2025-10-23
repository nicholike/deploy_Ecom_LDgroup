/**
 * Test script to verify UpdateGlobalPricingDto works with string literal keys
 */

import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

// Mock the DTO class inline
class PriceRangeDto {
  range1to9: number;
  range10to49: number;
  range50to99: number;
  range100plus: number;
}

class UpdateGlobalPricingDto {
  '5ml': PriceRangeDto;
  '20ml': PriceRangeDto;
}

async function testDto() {
  console.log('🧪 Testing DTO with 4-range pricing...\n');

  // Test case 1: Valid data
  const validData = {
    '5ml': { range1to9: 139000, range10to49: 109000, range50to99: 104000, range100plus: 99000 },
    '20ml': { range1to9: 450000, range10to49: 360000, range50to99: 345000, range100plus: 330000 },
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
  if (dto['5ml'] && dto['5ml'].range100plus === 99000) {
    console.log('✅ Can access 5ml.range100plus correctly:', dto['5ml'].range100plus);
  } else {
    console.log('❌ Cannot access 5ml.range100plus');
  }

  if (dto['20ml'] && dto['20ml'].range100plus === 330000) {
    console.log('✅ Can access 20ml.range100plus correctly:', dto['20ml'].range100plus);
  } else {
    console.log('❌ Cannot access 20ml.range100plus');
  }

  // Additional checks for all ranges
  if (dto['5ml'].range1to9 === 139000 && dto['5ml'].range10to49 === 109000 && dto['5ml'].range50to99 === 104000) {
    console.log('✅ All 5ml ranges accessible correctly');
  } else {
    console.log('❌ Some 5ml ranges not accessible');
  }
}

testDto().catch(console.error);
