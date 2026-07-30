import { IsString, IsOptional, IsUUID, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

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
