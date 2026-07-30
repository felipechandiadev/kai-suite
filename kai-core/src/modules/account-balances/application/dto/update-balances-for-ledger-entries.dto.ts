import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class LedgerEntryBalancePayloadDto {
  @IsUUID()
  transactionId!: string;

  @IsUUID()
  accountId!: string;

  @Type(() => Number)
  @IsNumber()
  debit!: number;

  @Type(() => Number)
  @IsNumber()
  credit!: number;
}

export class UpdateBalancesForLedgerEntriesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LedgerEntryBalancePayloadDto)
  ledgerEntries!: LedgerEntryBalancePayloadDto[];
}