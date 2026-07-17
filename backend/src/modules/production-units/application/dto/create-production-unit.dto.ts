import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateProductionUnitDto {
  @IsNotEmpty()
  @IsUUID()
  branchId!: string;

  /** Si se omite, el backend asigna correlativo `UPR#####`. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsUUID()
  defaultInputStorageId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
