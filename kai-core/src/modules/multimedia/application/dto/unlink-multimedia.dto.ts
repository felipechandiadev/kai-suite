import { IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class UnlinkMultimediaDto {
  @IsString()
  entityType!: string;

  @IsString()
  entityId!: string;

  @IsOptional()
  @IsString()
  usageType?: string;

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUUID()
  attributeId?: string;
}