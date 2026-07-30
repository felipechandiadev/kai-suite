import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CreatePersonDto } from '@modules/persons/application/dto/create-person.dto';
import { SupplierType } from '../../domain/supplier.entity';

export class CreateSupplierDto {
  /** Si no envía `person`, debe enviar un `personId` existente. */
  @ValidateIf((o: CreateSupplierDto) => !o.person)
  @IsNotEmpty({ message: 'Indique personId o los datos de person' })
  @IsUUID('4')
  personId?: string;

  /** Datos de persona a crear antes del proveedor (no combinar con personId). */
  @ValidateIf((o: CreateSupplierDto) => !o.personId)
  @IsDefined({ message: 'Indique personId o los datos de person' })
  @ValidateNested()
  @Type(() => CreatePersonDto)
  person?: CreatePersonDto;

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
}
