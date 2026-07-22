import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ProductionAttributeOptionDto {
  @IsUUID()
  id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @IsInt()
  displayOrder!: number;
}

export class ProductionAttributeItemDto {
  @IsUUID()
  id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  tagKey?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tagLabel?: string | null;

  @IsInt()
  displayOrder!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductionAttributeOptionDto)
  options!: ProductionAttributeOptionDto[];
}

export class UpsertVariantProductionAttributesDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => ProductionAttributeItemDto)
  items!: ProductionAttributeItemDto[];
}
