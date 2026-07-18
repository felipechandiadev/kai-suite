import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
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

export class CreateProductionUnitDto {
  @IsOptional()
  @IsIn([ProductionUnitScope.BRANCH, ProductionUnitScope.COMPANY])
  scope?: ProductionUnitScope;

  /** Required when scope is BRANCH (default). */
  @ValidateIf((o) => (o.scope ?? ProductionUnitScope.BRANCH) === ProductionUnitScope.BRANCH)
  @IsNotEmpty()
  @IsUUID()
  branchId?: string | null;

  /** Si se omite, el backend asigna correlativo `UPR#####`. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name!: string;

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
