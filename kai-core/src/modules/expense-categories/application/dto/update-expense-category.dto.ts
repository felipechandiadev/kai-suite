import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { ExpenseCategoryOperationalGroup } from '../../domain/expense-category-operational-group.enum';
import { ExpenseCategoryPnlNature } from '../../domain/expense-category-pnl-nature.enum';

export class UpdateExpenseCategoryDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEnum(ExpenseCategoryOperationalGroup)
  operationalExpenseGroup?: ExpenseCategoryOperationalGroup;

  @IsOptional()
  @IsEnum(ExpenseCategoryPnlNature)
  pnlNature?: ExpenseCategoryPnlNature;

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
  @IsArray()
  @IsString({ each: true })
  examples?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
