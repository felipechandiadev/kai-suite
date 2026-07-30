import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { AccountingPeriodStatus } from '../../domain/accounting-period.entity';

export class QueryAccountingPeriodsDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsEnum(AccountingPeriodStatus)
  status?: AccountingPeriodStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  year?: number;
}