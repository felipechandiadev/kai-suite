import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class LitePackLineDto {
  @ApiProperty()
  @IsUUID()
  componentVariantId!: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0.001)
  qty!: number;
}

export class LiteUpsertPackDto {
  @ApiProperty({ type: [LitePackLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LitePackLineDto)
  lines!: LitePackLineDto[];
}
