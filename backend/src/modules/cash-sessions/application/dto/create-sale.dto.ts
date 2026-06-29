import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsObject,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SaleLineDto {
  @IsString()
  productVariantId: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  unitCost?: number;
}

/**
 * Datos específicos de un cheque que acompañan a un `PaymentDetailDto`
 * cuando `paymentMethod === 'CHECK'`. Permite materializar un registro
 * `Check` independiente del ciclo de vida de la transacción.
 */
export class CheckPaymentDataDto {
  @IsString()
  checkNumber: string;

  @IsString()
  bankName: string;

  @IsOptional()
  @IsString()
  bankAccountKey?: string | null;

  @IsOptional()
  @IsString()
  drawerName?: string | null;

  @IsOptional()
  @IsString()
  drawerDocument?: string | null;

  @IsOptional()
  @IsString()
  payeeName?: string | null;

  @IsOptional()
  @IsString()
  payeeId?: string | null;

  @IsOptional()
  @IsString()
  issueDate?: string | null;

  @IsOptional()
  @IsString()
  dueDate?: string | null;
}

export class PaymentDetailDto {
  @IsString()
  paymentMethod: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  bankAccountId?: string;

  /**
   * Id estable del medio de pago configurado a nivel empresa
   * (`companies.settings.paymentMethods[].id`). Se usa para hidratar
   * el snapshot del medio en `transactions.metadata.paymentSnapshot(s)`.
   */
  @IsOptional()
  @IsString()
  companyPaymentMethodId?: string;

  /** Referencia opcional (n.º operación, autorización, etc.). */
  @IsOptional()
  @IsString()
  reference?: string;

  /** Intent Mercado Pago aprobado (POS Point). */
  @IsOptional()
  @IsUUID()
  paymentGatewayIntentId?: string;

  /** Transacción `CUSTOMER_CREDIT_NOTE` aplicada como medio de pago. */
  @IsOptional()
  @IsUUID()
  creditNoteTransactionId?: string;

  /** Transacción `BACKORDER` cuyo abono se aplica como medio de pago. */
  @IsOptional()
  @IsUUID()
  backorderTransactionId?: string;

  /**
   * Datos del cheque cuando `paymentMethod === 'CHECK'`. Se persiste en
   * `metadata.paymentSnapshots[].checkData` y se usa para crear un
   * `Check INCOMING` ligado a la transacción.
   */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CheckPaymentDataDto)
  checkData?: CheckPaymentDataDto;
}

/**
 * Snapshot mínimo de una promoción aplicada en cliente, enviado para
 * que el server lo re-valide en el cierre transaccional. Estructura
 * coincidente con `AppliedSnapshot` del motor.
 */
export class PromotionSnapshotDto {
  @IsString()
  promotionId: string;

  @IsString()
  promotionCode: string;

  @IsString()
  promotionName: string;

  @IsString()
  type: string;

  @IsString()
  activation: string;

  @IsString()
  authorization: string;

  @IsNumber()
  amountDiscounted: number;

  @IsArray()
  @IsString({ each: true })
  affectedLineIds: string[];

  @IsOptional()
  isOrderLevel?: boolean;

  @IsOptional()
  @IsString()
  accountingTag?: string | null;
}

export class CreateSaleDto {
  @IsString()
  userName: string;

  @IsString()
  pointOfSaleId: string;

  @IsString()
  cashSessionId: string;

  /**
   * Medio representativo para filtros/compatibilidad. Opcional si `payments`
   * trae al menos un ítem con monto > 0; el backend deriva el representativo
   * (mayor monto) desde los snapshots.
   */
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleLineDto)
  lines: SaleLineDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDetailDto)
  payments?: PaymentDetailDto[];

  @IsOptional()
  @IsNumber()
  amountPaid?: number;

  @IsOptional()
  @IsNumber()
  changeAmount?: number;

  @IsOptional()
  @IsString()
  customerId?: string;

  /** Liquidar reserva (`BACKORDER` abierta): valida líneas y libera stock comprometido. */
  @IsOptional()
  @IsUUID()
  fulfillBackorderId?: string;

  /** Cobrar ticket de preventa emitido en punto PRESALE. */
  @IsOptional()
  @IsUUID()
  fulfillPresaleTicketId?: string;

  /** Cobrar uno o más tickets de preventa en la misma venta. */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  fulfillPresaleTicketIds?: string[];

  /**
   * Venta confirmada sin cobro en caja: `paymentStatus` PENDING, sin `PAYMENT_IN`.
   * Requiere `customerId`. No aplica a encargo ni devolución.
   */
  @IsOptional()
  @IsBoolean()
  deferPayment?: boolean;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  storageId?: string;

  @IsOptional()
  @IsString()
  bankAccountKey?: string;

  @IsOptional()
  metadata?: any;

  /**
   * Snapshot de promociones aplicadas en el cliente. El backend lo usa
   * para re-validar contra el motor canónico, registrar redenciones y
   * controlar atomicidad de `maxUsesTotal`.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromotionSnapshotDto)
  promotionSnapshot?: PromotionSnapshotDto[];
}
