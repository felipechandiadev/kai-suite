import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { SyncCommandBaseDto } from './sync-command-base.dto';

export class SyncCashMovementCommandDto extends SyncCommandBaseDto {
  declare commandType: 'CASH_MOVEMENT';

  @IsIn(['DEPOSIT', 'WITHDRAWAL'])
  direction!: 'DEPOSIT' | 'WITHDRAWAL';

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
