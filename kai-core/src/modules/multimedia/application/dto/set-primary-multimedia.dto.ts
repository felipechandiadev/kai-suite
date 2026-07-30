import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class SetPrimaryMultimediaDto {
  @IsUUID()
  assetId!: string;

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUUID()
  attributeId?: string;
}
