import { IsUUID, IsOptional, IsEnum } from 'class-validator';
import { CashSessionStatus } from '@modules/cash-sessions/domain/cash-session.entity';

export class GetCashSessionsDto {
  @IsOptional()
  @IsUUID()
  pointOfSaleId?: string;

  @IsOptional()
  @IsEnum(CashSessionStatus)
  status?: CashSessionStatus;
}
