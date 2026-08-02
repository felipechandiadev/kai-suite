import { IsString, IsOptional, IsUUID, IsInt, Min, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

const toBoolean = ({ value }: { value: unknown }) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return value;
};

export class SearchPosProductsDto {
  @IsString()
  @IsOptional()
  query?: string;

  @IsUUID()
  @IsOptional()
  priceListId?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsUUID()
  @IsOptional()
  pointOfSaleId?: string;

  /**
   * Tipos de producto separados por coma (`PREPARADO,PHYSICAL`).
   * Si se omite, no filtra por tipo (excluye INSUMO).
   */
  @IsString()
  @IsOptional()
  productTypes?: string;

  /**
   * Categorías de producto separadas por coma (UUIDs).
   * Si se omite, no filtra por categoría.
   */
  @IsString()
  @IsOptional()
  categoryIds?: string;

  /**
   * Si true, solo productos con `on_menu=true` (carta / cuentas POS / mesero).
   */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  onMenuOnly?: boolean;

  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value ? parseInt(value, 10) : 1))
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value ? parseInt(value, 10) : 20))
  @IsOptional()
  pageSize?: number = 20;
}
