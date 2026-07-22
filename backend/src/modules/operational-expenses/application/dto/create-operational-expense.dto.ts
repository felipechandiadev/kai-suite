import {
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsEnum,
  IsString,
  MaxLength,
  IsArray,
  IsBoolean,
  IsObject,
  Validate,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  OperationalExpenseDocumentKind,
  OperationalExpenseStatus,
} from '../../domain/operational-expense.entity';
import { ForbidLegacyAttachmentsConstraint } from './forbid-legacy-attachments.constraint';
import { SupplierDocumentPaymentPlanDto } from '@modules/transactions/application/dto/supplier-document-payment-plan.dto';

export class OperationalExpenseFiscalAmountsDto {
  @IsNumber()
  @Min(0)
  subtotal!: number;

  @IsNumber()
  @Min(0)
  taxAmount!: number;

  @IsNumber()
  @Min(0.01)
  total!: number;

  @IsOptional()
  @IsUUID()
  taxId?: string;
}

export class CreateOperationalExpenseDto {
  @IsNotEmpty()
  @IsUUID()
  companyId!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  resultCenterId?: string;

  @IsNotEmpty()
  @IsUUID()
  categoryId!: string;

  @IsNotEmpty()
  @IsUUID()
  supplierId!: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(60)
  referenceNumber!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsDateString()
  operationDate!: string;

  @IsOptional()
  @IsEnum(OperationalExpenseStatus)
  status?: OperationalExpenseStatus;

  @IsNotEmpty()
  @IsEnum(OperationalExpenseDocumentKind)
  documentKind!: OperationalExpenseDocumentKind;

  @ValidateNested()
  @Type(() => OperationalExpenseFiscalAmountsDto)
  fiscalAmounts!: OperationalExpenseFiscalAmountsDto;

  @ValidateNested()
  @Type(() => SupplierDocumentPaymentPlanDto)
  supplierDocumentPayment!: SupplierDocumentPaymentPlanDto;

  @IsOptional()
  @IsObject()
  @Validate(ForbidLegacyAttachmentsConstraint)
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  multimediaAssetIds?: string[];

  /** After a successful create, also store a reusable template (no amounts/schedule). */
  @IsOptional()
  @IsBoolean()
  saveAsTemplate?: boolean;

  @IsNotEmpty()
  @IsUUID()
  createdBy!: string;
}
