import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { AccountTypeName, BankName } from '../../domain/person.entity';

const toBoolean = ({ value }: { value: unknown }) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return value;
};

export class PersonBankAccountDto {
  @IsOptional()
  @IsString()
  accountKey?: string;

  @IsEnum(BankName)
  bankName!: BankName;

  @IsEnum(AccountTypeName)
  accountType!: AccountTypeName;

  @IsString()
  accountNumber!: string;

  @IsOptional()
  @IsString()
  accountHolderName?: string;

  @IsOptional()
  @IsString()
  accountHolderRut?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  currentBalance?: number;
}