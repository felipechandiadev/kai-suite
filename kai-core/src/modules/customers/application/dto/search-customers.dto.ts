import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

const toBoolean = ({ value }: { value: unknown }) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return value;
};

export class SearchCustomersDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 10;

  /** Si es true, excluye clientes con `isActive = false` (p. ej. búsqueda en cobro POS). */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  activeOnly?: boolean;
}
