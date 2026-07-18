import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class VariantProductionUnitItemDto {
  @IsUUID()
  branchId!: string;

  @IsUUID()
  productionUnitId!: string;

  @IsBoolean()
  isDefault!: boolean;
}

export class UpsertVariantProductionUnitsDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => VariantProductionUnitItemDto)
  items!: VariantProductionUnitItemDto[];
}
