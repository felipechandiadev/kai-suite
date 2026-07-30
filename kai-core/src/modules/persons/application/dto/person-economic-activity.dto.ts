import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class PersonEconomicActivityDto {
  @IsString()
  @MaxLength(16)
  code!: string;

  @IsString()
  @MaxLength(500)
  name!: string;

  @IsIn(['PRIMERA', 'SEGUNDA'])
  category!: 'PRIMERA' | 'SEGUNDA';

  @IsBoolean()
  ivaAffected!: boolean;

  @IsBoolean()
  isActive!: boolean;
}

/** Campos geo + ACTECO compartidos por create/update person y customer. */
export class PersonGeoActivityFieldsDto {
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
}
