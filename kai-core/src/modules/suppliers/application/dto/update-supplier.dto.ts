import { Type } from 'class-transformer';
import {
  IsOptional,
  IsUUID,
  IsString,
  IsBoolean,
  IsEnum,
  IsNumber,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { SupplierType } from '../../domain/supplier.entity';
import { UpdatePersonDto } from '@modules/persons/application/dto/update-person.dto';

export class UpdateSupplierDto {
  @IsOptional()
  @IsUUID()
  personId?: string;

  @IsOptional()
  @IsEnum(SupplierType)
  supplierType?: SupplierType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  alias?: string;

  @IsOptional()
  @IsNumber()
  defaultPaymentTermDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Actualización parcial de la persona vinculada al proveedor. */
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePersonDto)
  person?: UpdatePersonDto;
}
