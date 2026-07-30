import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export enum PriceListType {
  RETAIL = 'RETAIL',
  WHOLESALE = 'WHOLESALE',
  VIP = 'VIP',
  PROMOTIONAL = 'PROMOTIONAL',
}

export class CreatePriceListDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsEnum(PriceListType)
  priceListType?: PriceListType;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}
