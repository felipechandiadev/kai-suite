import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class LitePosSaleLineDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.001)
  qty!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class LitePosSalePaymentDto {
  @ApiProperty({ example: 'CASH' })
  @IsString()
  @IsNotEmpty()
  method!: string;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;
}

export class LitePosSaleDto {
  @ApiProperty({ type: [LitePosSaleLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LitePosSaleLineDto)
  lines!: LitePosSaleLineDto[];

  @ApiProperty({ example: 'CASH' })
  @IsString()
  @IsNotEmpty()
  method!: string;

  @ApiPropertyOptional({ type: [LitePosSalePaymentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LitePosSalePaymentDto)
  payments?: LitePosSalePaymentDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  total!: number;
}
