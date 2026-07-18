import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  MinLength,
  IsNumber,
  IsIn,
  IsArray,
  MaxLength,
  ValidateNested,
  IsBoolean,
  IsUUID,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  PersonType,
  DocumentType,
} from '@modules/persons/domain/person.entity';
import { PersonEconomicActivityDto } from '@modules/persons/application/dto/person-economic-activity.dto';

/**
 * Crear cliente: `personId` de persona existente, o campos de persona nueva.
 * No combinar ambos.
 */
export class CreateCustomerDto {
  @ValidateIf((o: CreateCustomerDto) => !o.personType && !o.firstName)
  @IsUUID('4')
  @IsNotEmpty({ message: 'Indique personId o los datos de la persona' })
  personId?: string;

  @ValidateIf((o: CreateCustomerDto) => !o.personId)
  @IsEnum(PersonType)
  personType?: PersonType;

  @ValidateIf((o: CreateCustomerDto) => !o.personId)
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio' })
  firstName?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsString()
  lastName?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsString()
  businessName?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsEmail()
  email?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsString()
  phone?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  regionCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  regionName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  communeCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  communeName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  treasuryCode?: string | null;

  @IsOptional()
  @IsBoolean()
  activityStarted?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonEconomicActivityDto)
  economicActivities?: PersonEconomicActivityDto[] | null;

  @IsOptional()
  @IsNumber()
  creditLimit?: number;

  @IsOptional()
  @IsIn([5, 10, 15, 20, 25, 30])
  paymentDayOfMonth?: 5 | 10 | 15 | 20 | 25 | 30;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsString()
  notes?: string;
}
