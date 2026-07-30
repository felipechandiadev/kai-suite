import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { OperationalExpenseDocumentKind } from '../../domain/operational-expense.entity';

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
  @IsEnum(OperationalExpenseDocumentKind)
  documentKind?: OperationalExpenseDocumentKind;

  @IsOptional()
  @IsUUID()
  taxId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
