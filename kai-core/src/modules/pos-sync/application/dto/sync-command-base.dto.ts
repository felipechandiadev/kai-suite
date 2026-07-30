import { IsIn, IsString } from 'class-validator';
import { POS_SYNC_COMMAND_TYPES } from '../sync-command.types';

export class SyncCommandBaseDto {
  @IsString()
  clientOperationId!: string;

  @IsString()
  deviceId!: string;

  @IsIn(POS_SYNC_COMMAND_TYPES)
  commandType!: (typeof POS_SYNC_COMMAND_TYPES)[number];

  @IsString()
  userName!: string;

  @IsString()
  cashSessionId!: string;

  @IsString()
  pointOfSaleId!: string;
}
