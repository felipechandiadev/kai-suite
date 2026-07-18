import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  ProductionUnitInventoryMode,
  ProductionUnitPurpose,
  ProductionUnitScope,
} from '../../domain/production-unit.enums';

export class UpdateProductionUnitDto {
  @IsOptional()
  @IsIn([ProductionUnitScope.BRANCH, ProductionUnitScope.COMPANY])
  scope?: ProductionUnitScope;

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUUID()
  branchId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsIn([
    ProductionUnitInventoryMode.AUTONOMOUS,
    ProductionUnitInventoryMode.DEPENDENT,
  ])
  inventoryMode?: ProductionUnitInventoryMode;

  @IsOptional()
  @IsIn([ProductionUnitPurpose.KITCHEN, ProductionUnitPurpose.BATCH])
  purpose?: ProductionUnitPurpose;

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUUID()
  defaultInputStorageId?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUUID()
  defaultOutputStorageId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
