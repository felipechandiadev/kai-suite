import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class EnsureAccountingPeriodDto {
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;
}