import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { PriceListType } from './create-price-list.dto';

export class UpdatePriceListDto {
  @IsOptional()
  @IsString()
  name?: string;

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
  description?: string | null;
}

export class PriceListResponseDto {
  @IsUUID()
  id!: string;

  @IsString()
  name!: string;

  @IsEnum(PriceListType)
  priceListType!: PriceListType;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsDateString()
  validFrom?: Date;

  @IsOptional()
  @IsDateString()
  validUntil?: Date;

  @IsNumber()
  priority!: number;

  @IsBoolean()
  isDefault!: boolean;

  @IsBoolean()
  isActive!: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  createdAt!: Date;

  @IsDateString()
  updatedAt!: Date;

  @IsOptional()
  @IsDateString()
  deletedAt?: Date;
}
