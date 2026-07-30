import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class RegisterCashMovementDto {
  @IsString()
  userName!: string;

  @IsOptional()
  @IsUUID()
  pointOfSaleId?: string;

  @IsUUID()
  cashSessionId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}