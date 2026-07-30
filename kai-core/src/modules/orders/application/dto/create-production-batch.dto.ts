import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductionBatchLineAttributeDto {
  @IsUUID()
  attributeId!: string;

  @IsUUID()
  optionId!: string;
}

export class CreateProductionBatchLineDto {
  @IsUUID()
  productVariantId!: string;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Stable client key; generated server-side if omitted. */
  @IsOptional()
  @IsString()
  lineKey?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductionBatchLineAttributeDto)
  attributes?: CreateProductionBatchLineAttributeDto[];
}

export class CreateProductionBatchDto {
  @IsUUID()
  branchId!: string;

  @IsUUID()
  userId!: string;

  @IsUUID()
  productionUnitId!: string;

  @IsOptional()
  @IsUUID()
  storageId?: string;

  /** Almacén donde entra el producto terminado (obligatorio). */
  @IsUUID()
  outputStorageId!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** @deprecated Prefer per-line recipe resolution on complete. Kept for back-compat. */
  @IsOptional()
  @IsUUID()
  recipeId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  capacity?: number | null;

  @IsOptional()
  @IsString()
  plannedStartAt?: string | null;

  @IsOptional()
  @IsString()
  plannedDeliveryAt?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductionBatchLineDto)
  lines!: CreateProductionBatchLineDto[];
}

export class ListProductionBatchesQueryDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  storageId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}

export class SearchManufactureVariantsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsUUID()
  productionUnitId!: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
