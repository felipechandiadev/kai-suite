import { IsOptional, IsUUID } from 'class-validator';

export class CloseAccountingPeriodDto {
  @IsOptional()
  @IsUUID()
  userId?: string;
}