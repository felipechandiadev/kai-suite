import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { UnitDimension } from '@modules/units/domain/unit-dimension.enum';

export class LiteCreateUnitDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'u' })
  @IsString()
  @MinLength(1)
  symbol!: string;

  @ApiProperty({ enum: UnitDimension })
  @IsEnum(UnitDimension)
  dimension!: UnitDimension;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0.000000001)
  conversionFactor!: number;
}

export class LitePatchUnitDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  symbol?: string;

  @ApiPropertyOptional({ enum: UnitDimension })
  @IsOptional()
  @IsEnum(UnitDimension)
  dimension?: UnitDimension;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.000000001)
  conversionFactor?: number;
}
