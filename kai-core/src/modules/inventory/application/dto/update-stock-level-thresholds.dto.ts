import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * Umbrales opcionales por almacén (`stock_levels`). `null` borra el override y hereda la variante.
 */
export class UpdateStockLevelThresholdsDto {
  @IsUUID()
  productVariantId!: string;

  @IsUUID()
  storageId!: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimumStock?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maximumStock?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reorderPoint?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Boolean)
  @IsBoolean()
  minimumStockEnabled?: boolean | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Boolean)
  @IsBoolean()
  maximumStockEnabled?: boolean | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Boolean)
  @IsBoolean()
  reorderPointEnabled?: boolean | null;
}
