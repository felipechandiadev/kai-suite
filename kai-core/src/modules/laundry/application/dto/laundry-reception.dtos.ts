import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LaundryReceptionStatus } from '../../domain/laundry-reception-status.enum';
import { LaundryPaymentMode } from '../../domain/laundry-payment-mode.enum';

export class CreateReceptionServiceLineDto {
  @IsUUID()
  productVariantId!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateReceptionGarmentDto {
  @IsUUID()
  garmentTypeId!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsArray()
  attributeValues?: Record<string, unknown>[];

  @IsOptional()
  @IsString()
  careInstructions?: string;

  @IsOptional()
  @IsString()
  customerNotes?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReceptionServiceLineDto)
  serviceLines!: CreateReceptionServiceLineDto[];
}

export class CreateLaundryReceptionDto {
  @IsUUID()
  branchId!: string;

  @IsOptional()
  @IsUUID()
  pointOfSaleId?: string;

  @IsUUID()
  customerId!: string;

  @IsOptional()
  @IsEnum(LaundryReceptionStatus)
  status?: LaundryReceptionStatus;

  @IsOptional()
  @IsEnum(LaundryPaymentMode)
  paymentMode?: LaundryPaymentMode;

  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @IsOptional()
  @IsString()
  promisedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReceptionGarmentDto)
  garments!: CreateReceptionGarmentDto[];
}

export class UpdateLaundryReceptionStatusDto {
  @IsEnum(LaundryReceptionStatus)
  status!: LaundryReceptionStatus;
}

export class RecordLaundryReceptionPaymentDto {
  @IsNumber()
  @Min(0)
  paidAmount!: number;

  @IsOptional()
  @IsUUID()
  saleTransactionId?: string;

  @IsOptional()
  @IsUUID()
  depositTransactionId?: string;
}

export class ListLaundryReceptionsQueryDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsEnum(LaundryReceptionStatus)
  status?: LaundryReceptionStatus;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
