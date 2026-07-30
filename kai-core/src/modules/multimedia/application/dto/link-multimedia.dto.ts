import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min, ValidateIf } from 'class-validator';

const toBoolean = ({ value }: { value: unknown }) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return true;
    }
    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }

  return value;
};

const toInteger = ({ value }: { value: unknown }) => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return Number.parseInt(value, 10);
  }

  return value;
};

export class LinkMultimediaDto {
  @IsString()
  entityType!: string;

  @IsString()
  entityId!: string;

  @IsOptional()
  @IsString()
  usageType?: string;

  @IsOptional()
  @Transform(toInteger)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUUID()
  attributeId?: string;
}