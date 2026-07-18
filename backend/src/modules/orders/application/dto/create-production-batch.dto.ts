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

export class CreateProductionBatchLineDto {
  @IsUUID()
  productVariantId!: string;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsOptional()
  @IsString()
  productName?: string;
}

export class CreateProductionBatchDto {
  @IsUUID()
  branchId!: string;

  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsUUID()
  storageId?: string;

  /** Almacén donde entra el producto terminado (obligatorio salvo que la unidad lo defina). */
  @IsOptional()
  @IsUUID()
  outputStorageId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  recipeId?: string;

  @IsOptional()
  @IsUUID()
  productionUnitId?: string;

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
