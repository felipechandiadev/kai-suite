import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class LiteReceptionLineDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.001)
  qty!: number;
}

export class LiteReceptionDto {
  @ApiProperty({ example: 'Proveedor demo' })
  @IsString()
  @IsNotEmpty()
  supplierName!: string;

  @ApiProperty({ type: [LiteReceptionLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LiteReceptionLineDto)
  lines!: LiteReceptionLineDto[];
}
