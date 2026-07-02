import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  razonSocial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombreFantasia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  businessActivity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(14)
  rut?: string;

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
  siiResolutionNumber?: string;

  @IsOptional()
  @IsDateString()
  siiResolutionDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  mail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
}
