import {
  IsOptional,
  IsNumber,
  IsBoolean,
  IsString,
  Min,
  IsIn,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PersonEconomicActivityDto } from '@modules/persons/application/dto/person-economic-activity.dto';

export class UpdateCustomerDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsIn([5, 10, 15, 20, 25, 30])
  paymentDayOfMonth?: 5 | 10 | 15 | 20 | 25 | 30;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  businessName?: string;

  @IsOptional()
  @IsIn(['RUT', 'PASSPORT', 'OTHER'])
  documentType?: 'RUT' | 'PASSPORT' | 'OTHER';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  documentNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
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
  @IsBoolean()
  activityStarted?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonEconomicActivityDto)
  economicActivities?: PersonEconomicActivityDto[] | null;
}
