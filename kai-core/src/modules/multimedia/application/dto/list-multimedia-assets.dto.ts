import { IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class ListMultimediaAssetsDto {
  @IsOptional()
  @IsString()
  usageType?: string;

  /** UUID del atributo; omitir = galería general (sin atributo). */
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUUID()
  attributeId?: string;
}