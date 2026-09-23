import { ArrayMaxSize, IsArray, IsOptional, IsUUID } from 'class-validator';

export class SetLaborUnitAssociationsDto {
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  branchIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  storageIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  organizationalUnitIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  @ArrayMaxSize(1)
  productionUnitIds?: string[];
}
