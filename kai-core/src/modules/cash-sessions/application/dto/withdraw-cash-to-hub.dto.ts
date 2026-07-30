import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class WithdrawCashToHubBodyDto {
  @IsUUID()
  cashHubId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
