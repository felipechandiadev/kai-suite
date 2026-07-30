import { IsUUID } from 'class-validator';

export class GetAccountBalancesDto {
  @IsUUID()
  companyId!: string;

  @IsUUID()
  periodId!: string;
}