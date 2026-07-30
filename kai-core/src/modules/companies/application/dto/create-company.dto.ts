import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const COMPANY_KAI_PRODUCTS = [
  'kaistore',
  'kaifood',
  'kaiservices',
] as const;

export type CompanyKaiProduct = (typeof COMPANY_KAI_PRODUCTS)[number];

export class CreateCompanyDto {
  @IsString()
  @MaxLength(255)
  razonSocial!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombreFantasia?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  businessActivity?: string | null;

  @IsString()
  @MaxLength(14)
  rut!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  defaultCurrency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  mail?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  /** Vertical de la empresa. Default: según deploy. */
  @IsOptional()
  @IsIn(COMPANY_KAI_PRODUCTS)
  kaiProduct?: CompanyKaiProduct;
}
