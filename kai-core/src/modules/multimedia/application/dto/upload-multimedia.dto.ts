import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

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

export class UploadMultimediaDto {
  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  usageType?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUUID()
  attributeId?: string;
}