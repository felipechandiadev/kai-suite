import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CheckDirection, CheckStatus } from '../../domain/check.entity';

/**
 * Crear un cheque manualmente desde la cartera (raro: la vía normal es
 * la creación automática vía listener al confirmar una transacción).
 */
export class CreateCheckDto {
  @IsEnum(CheckDirection)
  direction!: CheckDirection;

  @IsString()
  @MaxLength(50)
  checkNumber!: string;

  @IsString()
  @MaxLength(120)
  bankName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankAccountKey?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  drawerName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  drawerDocument?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  payeeName?: string | null;

  @IsOptional()
  @IsUUID()
  payeeId?: string | null;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsString()
  issueDate!: string;

  @IsOptional()
  @IsString()
  dueDate?: string | null;

  @IsOptional()
  @IsUUID()
  transactionId?: string | null;
}

export class DepositCheckDto {
  @IsOptional()
  @IsString()
  depositDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ClearCheckDto {
  @IsOptional()
  @IsString()
  clearedDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BounceCheckDto {
  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class VoidCheckDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class EndorseCheckDto {
  @IsUUID()
  targetTransactionId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class MatchCheckMovementDto {
  @IsUUID()
  bankMovementId!: string;
}

export class ListChecksQueryDto {
  @IsOptional()
  @IsEnum(CheckStatus, { each: true })
  @IsArray()
  @Type(() => String)
  status?: CheckStatus[];

  @IsOptional()
  @IsEnum(CheckDirection)
  direction?: CheckDirection;

  @IsOptional()
  @IsString()
  dueDateFrom?: string;

  @IsOptional()
  @IsString()
  dueDateTo?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  payeeId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
