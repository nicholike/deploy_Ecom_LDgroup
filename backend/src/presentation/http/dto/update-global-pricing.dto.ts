import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PriceRangeDto {
  @ApiProperty({ example: 139000, description: 'Price per unit for range 1-9 bottles' })
  @IsNumber()
  @IsPositive()
  range1to9: number;

  @ApiProperty({ example: 109000, description: 'Price per unit for range 10-99 bottles' })
  @IsNumber()
  @IsPositive()
  range10to99: number;

  @ApiProperty({ example: 99000, description: 'Price per unit for range 100+ bottles' })
  @IsNumber()
  @IsPositive()
  range100plus: number;
}

export class UpdateGlobalPricingDto {
  @ApiProperty({
    type: PriceRangeDto,
    description: 'Pricing configuration for 5ml products',
    example: { range1to9: 139000, range10to99: 109000, range100plus: 99000 },
  })
  @ValidateNested()
  @Type(() => PriceRangeDto)
  '5ml': PriceRangeDto;

  @ApiProperty({
    type: PriceRangeDto,
    description: 'Pricing configuration for 20ml products',
    example: { range1to9: 450000, range10to99: 360000, range100plus: 330000 },
  })
  @ValidateNested()
  @Type(() => PriceRangeDto)
  '20ml': PriceRangeDto;
}
