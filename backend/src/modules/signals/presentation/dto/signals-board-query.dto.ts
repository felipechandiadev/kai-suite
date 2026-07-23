import { IsOptional, IsUUID } from 'class-validator';

export class SignalsBoardQueryDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;
}
