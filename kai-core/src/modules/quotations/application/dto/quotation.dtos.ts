import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '@modules/transactions/domain/transaction.entity';

/** Línea simplificada para crear una cotización. Espejo de
 * `CreateTransactionLineDto` pero con todos los campos numéricos opcionales
 * que el backend recalcula (subtotal/total) si no vienen. */
export class CreateQuotationLineDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  productVariantId?: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsString()
  productName!: string;

  @IsOptional()
  @IsString()
  productSku?: string;

  @IsOptional()
  @IsString()
  variantName?: string;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsUUID()
  taxId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  subtotal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  total?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateQuotationDto {
  @IsUUID()
  branchId!: string;

  @IsOptional()
  @IsUUID()
  pointOfSaleId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerDocument?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsUUID()
  priceListId?: string;

  /** Si se omite, se usa `now + defaultValidityDays` de la empresa. */
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationLineDto)
  lines!: CreateQuotationLineDto[];
}

export class CancelQuotationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ConvertQuotationDto {
  /** Tipo de transacción destino. Por defecto SALE. */
  @IsOptional()
  @IsEnum(TransactionType, {
    message: 'targetType debe ser SALE o CUSTOMER_ORDER',
  })
  targetType?: TransactionType.SALE | TransactionType.CUSTOMER_ORDER;

  /** Solo aplica si la conversión la hace el POS dentro de una sesión activa. */
  @IsOptional()
  @IsUUID()
  cashSessionId?: string;

  @IsOptional()
  @IsUUID()
  pointOfSaleId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListQuotationsQueryDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  /** Estado efectivo: ACTIVE | EXPIRED | CONVERTED | CANCELLED. */
  effectiveStatus?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  pointOfSaleId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
