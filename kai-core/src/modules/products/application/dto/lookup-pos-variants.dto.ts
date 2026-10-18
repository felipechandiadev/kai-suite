import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class LookupPosVariantsDto {
  /** IDs de variante separados por coma. */
  @IsString()
  variantIds: string;

  @IsUUID()
  @IsOptional()
  pointOfSaleId?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  /** Si se indica, solo devuelve variantes con precio en esa lista (favoritos POS). */
  @IsUUID()
  @IsOptional()
  priceListId?: string;

  /** Si true, cada producto incluye `hasAddons`. */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  includeAddonFlags?: boolean;
}
