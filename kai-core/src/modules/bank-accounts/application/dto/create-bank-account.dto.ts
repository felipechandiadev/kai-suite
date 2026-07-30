import { AccountTypeName, BankName } from '@modules/persons/domain/person.entity';
import { BankAccountOwnerType } from '../../domain/bank-account.entity';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBankAccountDto {
  @IsIn(['person', 'company'])
  ownerType!: BankAccountOwnerType;

  @IsUUID()
  ownerId!: string;

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
