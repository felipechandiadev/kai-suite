import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SiiEnvironment } from '../../domain/fiscal.enums';
import type { FiscalDocumentFamilies } from '../../domain/fiscal-document-family';

export class UpdateFiscalProfileDto {
  @IsOptional()
  @IsEnum(SiiEnvironment)
  environment?: SiiEnvironment;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  legalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(14)
  rut?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  businessActivity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  commune?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  resolutionNumber?: string;

  @IsOptional()
  @IsDateString()
  resolutionDate?: string;

  @IsOptional()
  @IsBoolean()
  portalPostulationDone?: boolean;

  @IsOptional()
  @IsBoolean()
  portalPermissionsDone?: boolean;

  @IsOptional()
  enabledDocumentFamilies?: FiscalDocumentFamilies;
}
