import { Type } from 'class-transformer';
import { IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { CloseCashSessionCountedDto } from '@modules/cash-sessions/application/dto/close-cash-session.dto';
import { SyncCommandBaseDto } from './sync-command-base.dto';

export class SyncCloseSessionCommandDto extends SyncCommandBaseDto {
  declare commandType: 'CLOSE_SESSION';

  @IsOptional()
  @IsUUID()
  cashHubId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CloseCashSessionCountedDto)
  counted?: CloseCashSessionCountedDto;
}
