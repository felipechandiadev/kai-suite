import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { SyncCommandBaseDto } from './sync-command-base.dto';

export class SyncHubDepositCommandDto extends SyncCommandBaseDto {
  declare commandType: 'HUB_DEPOSIT';

  @IsUUID()
  cashHubId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class SyncHubWithdrawalCommandDto extends SyncCommandBaseDto {
  declare commandType: 'HUB_WITHDRAWAL';

  @IsUUID()
  cashHubId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
