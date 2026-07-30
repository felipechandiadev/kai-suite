import { ArrayNotEmpty, IsArray, IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class ReorderMultimediaDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  assetIds!: string[];

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUUID()
  attributeId?: string;
}
