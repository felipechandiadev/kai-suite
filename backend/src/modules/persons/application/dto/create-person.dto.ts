import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { DocumentType, PersonType } from '../../domain/person.entity';
import { PersonBankAccountDto } from './person-bank-account.dto';
import { PersonEconomicActivityDto } from './person-economic-activity.dto';

export class CreatePersonDto {
  @IsOptional()
  @IsEnum(PersonType)
  type?: PersonType;

  @IsString()
  firstName!: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonEconomicActivityDto)
  economicActivities?: PersonEconomicActivityDto[] | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonBankAccountDto)
  bankAccounts?: PersonBankAccountDto[];
}
