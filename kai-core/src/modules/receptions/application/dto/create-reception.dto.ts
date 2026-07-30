import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsObject,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { RECEPTION_DTE_TYPES } from '../../domain/reception-dte-type';

export class ReceptionPaymentDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  installmentNumber?: number;
}

export class CreateReceptionLineDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  productVariantId?: string;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  variantName?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  receivedQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost?: number;
}

export class CreateReceptionDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsUUID()
  storageId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  /** POS: sesión de caja abierta; pagos en efectivo al momento salen de la caja (no cash hub). */
  @IsOptional()
  @IsUUID()
  cashSessionId?: string;

  @IsOptional()
  @IsUUID()
  pointOfSaleId?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  dteNumber?: string;

  @IsOptional()
  @IsString()
  @IsIn([...RECEPTION_DTE_TYPES])
  dteType?: (typeof RECEPTION_DTE_TYPES)[number];

  /** Alias en inglés de `dteType` (tipo de documento tributario). */
  @IsOptional()
  @IsString()
  @IsIn([...RECEPTION_DTE_TYPES])
  documentType?: (typeof RECEPTION_DTE_TYPES)[number];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceptionPaymentDto)
  payments?: ReceptionPaymentDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReceptionLineDto)
  lines?: CreateReceptionLineDto[];

  /** Plan de pago del documento fiscal (factura/boleta) en recepción directa. */
  @IsOptional()
  @IsObject()
  supplierDocumentPayment?: Record<string, unknown>;

  /** Totales neto/IVA/total y tasa para el documento fiscal asociado (UI builder). */
  @IsOptional()
  @IsObject()
  supplierFiscalAmounts?: Record<string, unknown>;
}