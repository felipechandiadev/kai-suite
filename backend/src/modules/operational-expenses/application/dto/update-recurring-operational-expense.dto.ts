import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RecurringOperationalExpenseFrequency } from '../../domain/recurring-operational-expense.entity';

export class UpdateRecurringOperationalExpenseDto {
  @IsOptional()
  @IsUUID()
  branchId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountNet?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  total?: number;

  @IsOptional()
  @IsUUID()
  taxId?: string | null;

  @IsOptional()
  @IsEnum(RecurringOperationalExpenseFrequency)
  frequency?: RecurringOperationalExpenseFrequency;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  dayOfMonth?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
