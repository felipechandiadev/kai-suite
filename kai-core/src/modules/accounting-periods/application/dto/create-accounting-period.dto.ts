import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AccountingPeriodStatus } from '../../domain/accounting-period.entity';

export class CreateAccountingPeriodDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(AccountingPeriodStatus)
  status?: AccountingPeriodStatus;
}