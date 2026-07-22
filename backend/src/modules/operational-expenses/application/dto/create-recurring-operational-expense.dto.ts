import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RecurringOperationalExpenseFrequency } from '../../domain/recurring-operational-expense.entity';
import { OperationalExpenseDocumentKind } from '../../domain/operational-expense.entity';

/** Direct create is deprecated in UI; prefer from-operating-expense / saveAsTemplate. */
export class CreateRecurringOperationalExpenseDto {
  @IsNotEmpty()
  @IsUUID()
  companyId!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsUUID()
  categoryId!: string;

  @IsNotEmpty()
  @IsUUID()
  supplierId!: string;

  @IsOptional()
  @IsEnum(OperationalExpenseDocumentKind)
  documentKind?: OperationalExpenseDocumentKind;

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
  taxId?: string;

  @IsOptional()
  @IsEnum(RecurringOperationalExpenseFrequency)
  frequency?: RecurringOperationalExpenseFrequency;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  dayOfMonth?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsUUID()
  sourceOperationalExpenseId?: string;

  @IsNotEmpty()
  @IsUUID()
  createdBy!: string;
}
