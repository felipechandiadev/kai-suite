import {
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsString,
  IsBoolean,
  MaxLength,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ExpenseCategoryOperationalGroup } from '../../domain/expense-category-operational-group.enum';
import { ExpenseCategoryPnlNature } from '../../domain/expense-category-pnl-nature.enum';

export class CreateExpenseCategoryDto {
  @IsNotEmpty()
  @IsUUID()
  companyId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsNotEmpty()
  @IsEnum(ExpenseCategoryOperationalGroup)
  operationalExpenseGroup!: ExpenseCategoryOperationalGroup;

  @IsNotEmpty()
  @IsEnum(ExpenseCategoryPnlNature)
  pnlNature!: ExpenseCategoryPnlNature;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsNumber()
  approvalThreshold?: number;

  @IsOptional()
  @IsUUID()
  defaultResultCenterId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  examples?: string[];

  @IsOptional()
  metadata?: Record<string, unknown>;
}
