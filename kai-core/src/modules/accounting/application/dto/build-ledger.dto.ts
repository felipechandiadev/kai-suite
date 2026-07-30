import { IsString, IsOptional, IsDateString, IsNumber } from 'class-validator';

export class BuildLedgerDto {
  @IsString()
  companyId: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  resultCenterId?: string;

  @IsOptional()
  @IsNumber()
  limitTransactions?: number;
}
