import {
  IsArray,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Validate,
} from 'class-validator';
import { OperationalExpenseStatus } from '../../domain/operational-expense.entity';
import { ForbidLegacyAttachmentsConstraint } from './forbid-legacy-attachments.constraint';

export class UpdateOperationalExpenseDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  resultCenterId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  operationDate?: string;

  @IsOptional()
  @IsEnum(OperationalExpenseStatus)
  status?: OperationalExpenseStatus;

  @IsOptional()
  @IsObject()
  @Validate(ForbidLegacyAttachmentsConstraint)
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  multimediaAssetIds?: string[];

  @IsOptional()
  @IsUUID()
  createdBy?: string;
}
