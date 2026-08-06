import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  KitchenFulfillmentMode,
  ProductionUnitInventoryMode,
  ProductionUnitPurpose,
  ProductionUnitScope,
  type KitchenPrintSettings,
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

  /** @deprecated Not required; output is selected on the production order. */
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUUID()
  defaultOutputStorageId?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyCapacity?: number | null;

  @IsOptional()
  @IsUUID('4', { each: true })
  laborUnitIds?: string[];

  @IsOptional()
  @IsUUID('4', { each: true })
  employeeIds?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn([
    KitchenFulfillmentMode.KDS,
    KitchenFulfillmentMode.PRINTED,
    KitchenFulfillmentMode.BOTH,
  ])
  kitchenFulfillmentMode?: KitchenFulfillmentMode;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsObject()
  kitchenPrintSettings?: KitchenPrintSettings | null;
}
