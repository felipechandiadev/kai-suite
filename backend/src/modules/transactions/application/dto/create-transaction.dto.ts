/**
 * CREATE TRANSACTION DTO - Base Coherente
 *
 * Este DTO es la ÚNICA forma de crear transacciones en el sistema.
 * Todos los servicios deben convertir sus payloads a este DTO y luego
 * llamar a TransactionsService.createTransaction(dto)
 */

import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMinSize,
  Min,
  Max,
  IsObject,
  IsDateString,
} from 'class-validator';
import { Type, plainToInstance } from 'class-transformer';
import {
  TransactionType,
  TransactionStatus,
  PaymentMethod,
  PaymentStatus,
} from '@modules/transactions/domain/transaction.entity';

/**
 * Línea de transacción (para SALE, PURCHASE, etc)
 */
export class CreateTransactionLineDto {
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
  @Min(0.01)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  quantityInBase?: number;

  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @IsOptional()
  @IsNumber()
  unitConversionFactor?: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsNumber()
  @Min(0)
  discountPercentage: number = 0;

  @IsNumber()
  @Min(0)
  discountAmount: number = 0;

  @IsOptional()
  @IsUUID()
  taxId?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate: number = 0;

  @IsNumber()
  @Min(0)
  taxAmount: number = 0;

  @IsNumber()
  @Min(0)
  subtotal!: number;

  @IsNumber()
  @Min(0)
  total!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO Principal - Crear Transacción Genérica
 *
 * Este DTO cubre TODOS los tipos de transacción.
 * Ciertos campos son requeridos según el transactionType.
 */
import { validateSync } from 'class-validator';

export class CreateTransactionDto {
  // ==========================================
  // CAMPOS REQUERIDOS SIEMPRE
  // ==========================================

  @IsEnum(TransactionType)
  transactionType!: TransactionType;

  /** Si se omite en creación → CONFIRMED en el use case. Solo PURCHASE_ORDER admite DRAFT de forma segura desde pedidos OC. */
  @IsOptional()
  @IsEnum(TransactionStatus)
  transactionStatus?: TransactionStatus;

  @IsUUID()
  branchId!: string;

  @IsUUID()
  userId!: string;

  /** Folio preasignado (p. ej. recepción que ya reservó CMP2600001). Si se omite, se asigna correlativo. */
  @IsOptional()
  @IsString()
  documentNumber?: string;

  // ==========================================
  // MONTOS
  // ==========================================

  @IsNumber()
  @Min(0)
  subtotal: number = 0;

  @IsNumber()
  @Min(0)
  taxAmount: number = 0;

  @IsNumber()
  @Min(0)
  discountAmount: number = 0;

  @IsNumber()
  @Min(0)
  total!: number;

  // ==========================================
  // MÉTODOS DE PAGO Y ESTADO
  // ==========================================

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod = PaymentMethod.CASH;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsNumber()
  @Min(0)
  amountPaid: number = 0;

  @IsOptional()
  @IsNumber()
  changeAmount?: number;

  // ==========================================
  // RELACIONES POR TIPO DE TRANSACCIÓN
  // ==========================================

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsUUID()
  shareholderId?: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsUUID()
  pointOfSaleId?: string;

  @IsOptional()
  @IsUUID()
  cashSessionId?: string;

  @IsOptional()
  @IsUUID()
  storageId?: string;

  @IsOptional()
  @IsUUID()
  targetStorageId?: string;

  @IsOptional()
  @IsUUID()
  expenseCategoryId?: string;

  @IsOptional()
  @IsUUID()
  resultCenterId?: string;

  @IsOptional()
  @IsUUID()
  accountingPeriodId?: string;

  // ==========================================
  // REFERENCIAS Y DOCUMENTACIÓN
  // ==========================================

  @IsOptional()
  @IsString()
  documentType?: string; // 'Factura', 'Boleta', 'Guía', etc.

  @IsOptional()
  @IsString()
  documentFolio?: string; // Número externo del documento

  @IsOptional()
  @IsDateString()
  paymentDueDate?: string;

  @IsOptional()
  @IsUUID()
  relatedTransactionId?: string;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsString()
  bankAccountKey?: string;

  @IsOptional()
  @IsUUID()
  cashHubId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // ==========================================
  // LÍNEAS (Para SALE, PURCHASE, etc)
  // ==========================================

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateTransactionLineDto)
  @ArrayMinSize(0)
  lines?: CreateTransactionLineDto[] = [];

  // ==========================================
  // METADATOS PARA REGLAS CONTABLES
  // ==========================================

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  // ==========================================
  // VALIDACIONES ADICIONALES
  // ==========================================

  /**
   * Validaciones custom: según transactionType, ciertos campos son requeridos
   */
  validate(): string[] {
    const errors: string[] = [];

    // Nested líneas deben ser instancias DTO; si no, validateSync falla con
    // "an unknown value was passed to the validate function" (objetos planos).
    if (this.lines?.length) {
      this.lines = this.lines.map((line) =>
        plainToInstance(CreateTransactionLineDto, line as object, {
          enableImplicitConversion: true,
        }),
      );
    }

    // run class-validator sync validation first
    const syncErrors = validateSync(this, { skipMissingProperties: false });
    if (syncErrors && syncErrors.length > 0) {
      const extract = (err: any) => {
        if (err.constraints) {
          errors.push(...Object.values(err.constraints).map(c => String(c)));
        }
        if (err.children && err.children.length) {
          err.children.forEach(extract);
        }
      };
      syncErrors.forEach(extract);
    }

    // algunos tipos necesitan monto positivo
    const poDraft =
      this.transactionType === TransactionType.PURCHASE_ORDER &&
      this.transactionStatus === TransactionStatus.DRAFT;

    const requirePositive = [
      TransactionType.SALE,
      TransactionType.SALE_RETURN,
      TransactionType.CUSTOMER_CREDIT_NOTE,
      TransactionType.CUSTOMER_CREDIT_NOTE_PAYOUT,
      TransactionType.PURCHASE,
      TransactionType.PURCHASE_ORDER,
      TransactionType.PURCHASE_RETURN,
      TransactionType.SUPPLIER_INVOICE,
      TransactionType.SUPPLIER_RECEIPT,
      TransactionType.SUPPLIER_HONORARIUM_RECEIPT,
      TransactionType.SUPPLIER_GUIDE,
      TransactionType.SUPPLIER_CREDIT_NOTE,
      TransactionType.SUPPLIER_PAYMENT,
      TransactionType.PAYROLL_PAYMENT,
      TransactionType.BANK_TO_CASH_TRANSFER,
      TransactionType.EXPENSE_PAYMENT,
      TransactionType.CASH_DEPOSIT,
      TransactionType.CAPITAL_CONTRIBUTION,
      TransactionType.BANK_WITHDRAWAL_TO_SHAREHOLDER,
      TransactionType.CASH_WITHDRAWAL_TO_PETTY_CASH,
      TransactionType.CASH_SESSION_TO_HUB_TRANSFER,
      TransactionType.CASH_SESSION_DEPOSIT,
      TransactionType.PAYMENT_IN,
      TransactionType.PAYROLL,
      TransactionType.PAYMENT_EXECUTION,
      TransactionType.BACKORDER,
      TransactionType.CUSTOMER_ORDER,
    ];
    if (requirePositive.includes(this.transactionType) && !poDraft) {
      if (this.subtotal < 0.01) {
        errors.push('subtotal debe ser mayor a 0');
      }
      if (this.total < 0.01) {
        errors.push('total debe ser mayor a 0');
      }
    }

    switch (this.transactionType) {
      case TransactionType.PAYMENT_IN:
        if (
          this.metadata?.capitalContribution &&
          !this.shareholderId &&
          !this.bankAccountKey
        ) {
          errors.push(
            'capitalContribution requiere shareholderId o bankAccountKey',
          );
        }
        break;

      case TransactionType.CUSTOMER_CREDIT_NOTE_PAYOUT: {
        if (!this.customerId?.trim()) {
          errors.push('CUSTOMER_CREDIT_NOTE_PAYOUT requiere customerId');
        }
        if (!this.cashSessionId?.trim()) {
          errors.push('CUSTOMER_CREDIT_NOTE_PAYOUT requiere cashSessionId');
        }
        const meta =
          this.metadata && typeof this.metadata === 'object'
            ? (this.metadata as Record<string, unknown>)
            : null;
        const alloc = meta?.allocations;
        if (!Array.isArray(alloc) || alloc.length === 0) {
          errors.push(
            'CUSTOMER_CREDIT_NOTE_PAYOUT requiere metadata.allocations con al menos una nota de crédito',
          );
        }
        break;
      }

      case TransactionType.CAPITAL_CONTRIBUTION:
        if (!this.shareholderId) {
          errors.push('CAPITAL_CONTRIBUTION requiere shareholderId');
        }
        if (!this.bankAccountKey && !this.cashHubId) {
          errors.push(
            'CAPITAL_CONTRIBUTION requiere bankAccountKey o cashHubId',
          );
        }
        break;

      case TransactionType.BANK_WITHDRAWAL_TO_SHAREHOLDER:
        if (!this.shareholderId) {
          errors.push('BANK_WITHDRAWAL_TO_SHAREHOLDER requiere shareholderId');
        }
        if (!this.bankAccountKey) {
          errors.push('BANK_WITHDRAWAL_TO_SHAREHOLDER requiere bankAccountKey');
        }
        break;

      case TransactionType.CASH_WITHDRAWAL_TO_PETTY_CASH:
        if (!this.bankAccountKey) {
          errors.push('CASH_WITHDRAWAL_TO_PETTY_CASH requiere bankAccountKey');
        }
        break;

      case TransactionType.BANK_TO_CASH_TRANSFER:
        if (!this.bankAccountKey) {
          errors.push('BANK_TO_CASH_TRANSFER requiere bankAccountKey');
        }
        if (!this.cashHubId?.trim()) {
          errors.push('BANK_TO_CASH_TRANSFER requiere cashHubId (centro de efectivo destino)');
        }
        break;

      case TransactionType.PAYMENT_EXECUTION:
        if (!this.relatedTransactionId) {
          errors.push(
            'PAYMENT_EXECUTION requiere relatedTransactionId (documento de pago origen)',
          );
        }
        if (!this.total) {
          errors.push('PAYMENT_EXECUTION requiere monto');
        }
        if (!this.paymentMethod) {
          errors.push('PAYMENT_EXECUTION requiere paymentMethod');
        }
        break;

      case TransactionType.SUPPLIER_PAYMENT:
        if (!this.supplierId) {
          errors.push('SUPPLIER_PAYMENT requiere supplierId');
        }
        if (!this.relatedTransactionId) {
          errors.push(
            'SUPPLIER_PAYMENT requiere relatedTransactionId (compra o documento proveedor)',
          );
        }
        if (!this.total) {
          errors.push('SUPPLIER_PAYMENT requiere monto');
        }
        if (
          !this.paymentMethod &&
          this.transactionStatus !== TransactionStatus.DRAFT
        ) {
          errors.push('SUPPLIER_PAYMENT requiere paymentMethod');
        }
        break;

      case TransactionType.PAYROLL_PAYMENT:
        if (!this.employeeId) {
          errors.push('PAYROLL_PAYMENT requiere employeeId');
        }
        if (!this.relatedTransactionId) {
          errors.push(
            'PAYROLL_PAYMENT requiere relatedTransactionId (liquidación PAYROLL u origen)',
          );
        }
        if (!this.total) {
          errors.push('PAYROLL_PAYMENT requiere monto');
        }
        if (
          !this.paymentMethod &&
          this.transactionStatus !== TransactionStatus.DRAFT
        ) {
          errors.push('PAYROLL_PAYMENT requiere paymentMethod');
        }
        break;

      case TransactionType.EXPENSE_PAYMENT:
        if (!this.expenseCategoryId) {
          errors.push('EXPENSE_PAYMENT requiere expenseCategoryId');
        }
        if (!this.relatedTransactionId) {
          errors.push(
            'EXPENSE_PAYMENT requiere relatedTransactionId (gasto OPERATING_EXPENSE)',
          );
        }
        if (!this.total) {
          errors.push('EXPENSE_PAYMENT requiere monto');
        }
        if (
          !this.paymentMethod &&
          this.transactionStatus !== TransactionStatus.DRAFT
        ) {
          errors.push('EXPENSE_PAYMENT requiere paymentMethod');
        }
        break;

      case TransactionType.CASH_DEPOSIT:
        if (!this.bankAccountKey) {
          errors.push('CASH_DEPOSIT requiere bankAccountKey');
        }
        break;

      case TransactionType.CASH_SESSION_TO_HUB_TRANSFER:
        if (!this.cashSessionId) {
          errors.push('CASH_SESSION_TO_HUB_TRANSFER requiere cashSessionId');
        }
        if (!this.cashHubId) {
          errors.push('CASH_SESSION_TO_HUB_TRANSFER requiere cashHubId');
        }
        if (!this.pointOfSaleId) {
          errors.push('CASH_SESSION_TO_HUB_TRANSFER requiere pointOfSaleId');
        }
        break;

      case TransactionType.CASH_SESSION_DEPOSIT:
        if (!this.cashSessionId) {
          errors.push('CASH_SESSION_DEPOSIT requiere cashSessionId');
        }
        if (!this.pointOfSaleId) {
          errors.push('CASH_SESSION_DEPOSIT requiere pointOfSaleId');
        }
        if (!this.cashHubId) {
          errors.push(
            'CASH_SESSION_DEPOSIT requiere cashHubId (centro de acopio de origen)',
          );
        }
        break;

      case TransactionType.CASH_SESSION_OPENING:
        if (!this.pointOfSaleId) {
          errors.push('CASH_SESSION_OPENING requiere pointOfSaleId');
        }
        break;

      case TransactionType.SALE:
        if (!this.customerId && !this.pointOfSaleId) {
          errors.push('SALE requiere customerId o pointOfSaleId');
        }
        if (this.lines && this.lines.length === 0) {
          errors.push('SALE requiere al menos una línea');
        }
        break;

      case TransactionType.SALE_RETURN: {
        const uuidRe =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!this.customerId?.trim()) {
          errors.push('SALE_RETURN requiere customerId');
        }
        if (
          !this.relatedTransactionId?.trim() ||
          !uuidRe.test(String(this.relatedTransactionId).trim())
        ) {
          errors.push(
            'SALE_RETURN requiere relatedTransactionId (UUID de la venta SALE origen)',
          );
        }
        if (!this.storageId?.trim()) {
          errors.push('SALE_RETURN requiere storageId');
        }
        if (!this.lines || this.lines.length === 0) {
          errors.push('SALE_RETURN requiere al menos una línea');
        }
        break;
      }

      case TransactionType.CUSTOMER_CREDIT_NOTE: {
        if (!this.customerId?.trim()) {
          errors.push('CUSTOMER_CREDIT_NOTE requiere customerId');
        }
        const srId = this.metadata?.links?.saleReturnId;
        const boId = this.metadata?.links?.backorderId;
        const uuidRe =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const srOk =
          srId && typeof srId === 'string' && uuidRe.test(String(srId).trim());
        const boOk =
          boId && typeof boId === 'string' && uuidRe.test(String(boId).trim());
        if (!srOk && !boOk) {
          errors.push(
            'CUSTOMER_CREDIT_NOTE requiere metadata.links.saleReturnId (devolución) o metadata.links.backorderId (anulación de encargo)',
          );
        }
        break;
      }

      case TransactionType.PURCHASE:
        if (!this.supplierId) {
          errors.push('PURCHASE requiere supplierId');
        }
        if (this.lines && this.lines.length === 0) {
          errors.push('PURCHASE requiere al menos una línea');
        }
        break;

      case TransactionType.PURCHASE_ORDER:
        if (!poDraft) {
          if (!this.supplierId) {
            errors.push('PURCHASE_ORDER requiere supplierId');
          }
          if (!this.lines || this.lines.length === 0) {
            errors.push('PURCHASE_ORDER requiere al menos una línea');
          }
        }
        break;

      case TransactionType.OPERATING_EXPENSE:
        if (!this.expenseCategoryId) {
          errors.push('OPERATING_EXPENSE requiere expenseCategoryId');
        }
        break;

      case TransactionType.PURCHASE_RETURN:
        if (!this.supplierId) {
          errors.push('PURCHASE_RETURN requiere supplierId');
        }
        if (!this.storageId) {
          errors.push('PURCHASE_RETURN requiere storageId');
        }
        if (!this.lines || this.lines.length === 0) {
          errors.push('PURCHASE_RETURN requiere al menos una línea');
        }
        break;

      case TransactionType.SUPPLIER_INVOICE:
      case TransactionType.SUPPLIER_RECEIPT:
      case TransactionType.SUPPLIER_HONORARIUM_RECEIPT:
      case TransactionType.SUPPLIER_GUIDE: {
        if (!this.supplierId) {
          errors.push(`${this.transactionType} requiere supplierId`);
        }
        if (!this.lines || this.lines.length === 0) {
          errors.push(`${this.transactionType} requiere al menos una línea`);
        }
        break;
      }

      case TransactionType.SUPPLIER_CREDIT_NOTE: {
        if (!this.supplierId) {
          errors.push('SUPPLIER_CREDIT_NOTE requiere supplierId');
        }
        const prId = this.metadata?.links?.purchaseReturnId;
        const uuidRe =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!prId || typeof prId !== 'string' || !uuidRe.test(String(prId).trim())) {
          errors.push(
            'SUPPLIER_CREDIT_NOTE requiere metadata.links.purchaseReturnId (UUID de PURCHASE_RETURN)',
          );
        }
        if (!this.lines || this.lines.length === 0) {
          errors.push('SUPPLIER_CREDIT_NOTE requiere al menos una línea');
        }
        break;
      }

      case TransactionType.CUSTOMER_ORDER: {
        if (!this.lines || this.lines.length === 0) {
          errors.push('CUSTOMER_ORDER requiere al menos una línea');
        }
        if (this.metadata?.source === 'e-shop') {
          if (!this.customerId) {
            errors.push('Pedido eShop requiere customerId');
          }
          const eo = this.metadata?.eShopOrder;
          if (!eo || typeof eo !== 'object') {
            errors.push('Pedido eShop requiere metadata.eShopOrder');
          }
        }
        break;
      }

      case TransactionType.BACKORDER: {
        if (!this.customerId) {
          errors.push('BACKORDER requiere customerId');
        }
        if (!this.lines || this.lines.length === 0) {
          errors.push('BACKORDER requiere al menos una línea');
        }
        const bo = this.metadata?.backorder;
        if (!bo || typeof bo !== 'object') {
          errors.push('BACKORDER requiere metadata.backorder');
          break;
        }
        const dep = Number((bo as { depositAmount?: unknown }).depositAmount);
        if (!Number.isFinite(dep) || dep < 0) {
          errors.push(
            'BACKORDER requiere metadata.backorder.depositAmount (>= 0)',
          );
        }
        if (dep > this.total + 0.01) {
          errors.push(
            'BACKORDER: anticipo (depositAmount) no puede superar el total del documento',
          );
        }
        break;
      }

      // ... más validaciones según tipo...
    }

    // Validación: Si hay líneas, total debe ser suma de líneas
    if (this.lines && this.lines.length > 0) {
      const linesTotal = this.lines.reduce((sum, line) => sum + line.total, 0);
      if (Math.abs(linesTotal - this.total) > 0.01) {
        errors.push(
          `Total de líneas (${linesTotal}) no coincide con total (${this.total})`,
        );
      }
    }

    return errors;
  }
}

/**
 * DTO para operaciones específicas (legacy, en transición)
 * Estos DTOs específicos deben convertirse a CreateTransactionDto antes de usar
 */

export class CreateCapitalContributionDto {
  shareholderId!: string;
  bankAccountKey?: string;
  cashHubId?: string;
  amount!: number;
  notes?: string;
  occurredOn?: string;

  toCreateTransactionDto(
    userId: string,
    branchId: string,
  ): CreateTransactionDto {
    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.CAPITAL_CONTRIBUTION;
    dto.branchId = branchId;
    dto.userId = userId;
    dto.shareholderId = this.shareholderId;
    const hubId = this.cashHubId?.trim();
    if (hubId) {
      dto.cashHubId = hubId;
      dto.paymentMethod = PaymentMethod.CASH;
    } else {
      dto.bankAccountKey = this.bankAccountKey;
      dto.paymentMethod = PaymentMethod.TRANSFER;
    }
    dto.subtotal = this.amount;
    dto.taxAmount = 0;
    dto.discountAmount = 0;
    dto.total = this.amount;
    dto.paymentStatus = PaymentStatus.PAID;
    dto.amountPaid = this.amount;
    dto.notes = this.notes;
    dto.metadata = {
      capitalContribution: true,
      partnerId: this.shareholderId,
      occurredOn: this.occurredOn,
      ...(hubId ? { capitalContributionCashHub: true, cashHubId: hubId } : {}),
    };
    return dto;
  }
}

export class CreateCashDepositDto {
  bankAccountKey!: string;
  amount!: number;
  notes?: string;
  occurredOn?: string;
  /** Depósito desde centro de acopio (1110) hacia banco; si se omite, caja clásica (1101). */
  cashHubId?: string;

  toCreateTransactionDto(
    userId: string,
    branchId: string,
  ): CreateTransactionDto {
    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.CASH_DEPOSIT;
    dto.branchId = branchId;
    dto.userId = userId;
    dto.bankAccountKey = this.bankAccountKey;
    if (this.cashHubId) {
      dto.cashHubId = this.cashHubId;
    }
    dto.subtotal = this.amount;
    dto.taxAmount = 0;
    dto.discountAmount = 0;
    dto.total = this.amount;
    dto.paymentMethod = PaymentMethod.CASH;
    dto.paymentStatus = PaymentStatus.PAID;
    dto.amountPaid = this.amount;
    dto.notes = this.notes;
    dto.metadata = {
      cashDeposit: true,
      ...(this.cashHubId ? { cashHubDeposit: true, cashHubId: this.cashHubId } : {}),
      occurredOn: this.occurredOn,
    };
    return dto;
  }
}

export class CreateBankTransferDto {
  bankAccountKey!: string;
  cashHubId!: string;
  amount!: number;
  notes?: string;
  occurredOn?: string;

  toCreateTransactionDto(
    userId: string,
    branchId: string,
  ): CreateTransactionDto {
    const hubId = this.cashHubId?.trim() ?? '';
    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.BANK_TO_CASH_TRANSFER;
    dto.branchId = branchId;
    dto.userId = userId;
    dto.bankAccountKey = this.bankAccountKey;
    dto.cashHubId = hubId;
    dto.subtotal = this.amount;
    dto.taxAmount = 0;
    dto.discountAmount = 0;
    dto.total = this.amount;
    dto.paymentMethod = PaymentMethod.TRANSFER;
    dto.amountPaid = this.amount;
    dto.notes = this.notes;
    dto.metadata = {
      bankToCashTransfer: true,
      bankToCashHubTransfer: true,
      cashHubId: hubId,
      occurredOn: this.occurredOn,
    };
    return dto;
  }
}

export class CreateBankWithdrawalToShareholderDto {
  shareholderId!: string;
  bankAccountKey!: string;
  amount!: number;
  notes?: string;
  occurredOn?: string;
  /** Retención de impuesto u otra retención (opcional), persiste en metadata. */
  taxRetention?: number;

  toCreateTransactionDto(
    userId: string,
    branchId: string,
  ): CreateTransactionDto {
    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.BANK_WITHDRAWAL_TO_SHAREHOLDER;
    dto.branchId = branchId;
    dto.userId = userId;
    dto.shareholderId = this.shareholderId;
    dto.bankAccountKey = this.bankAccountKey;
    dto.subtotal = this.amount;
    dto.taxAmount = 0;
    dto.discountAmount = 0;
    dto.total = this.amount;
    dto.paymentMethod = PaymentMethod.TRANSFER;
    dto.paymentStatus = PaymentStatus.PAID;
    dto.amountPaid = this.amount;
    dto.notes = this.notes;
    dto.metadata = {
      bankWithdrawalToShareholder: true,
      dividendDistribution: true,
      partnerId: this.shareholderId,
      ...(this.taxRetention != null && Number.isFinite(this.taxRetention)
        ? { taxRetention: Number(this.taxRetention) }
        : {}),
      occurredOn: this.occurredOn,
    };
    return dto;
  }
}

export class CreateCashWithdrawalToPettyCashDto {
  bankAccountKey!: string;
  amount!: number;
  notes?: string;
  occurredOn?: string;

  toCreateTransactionDto(userId: string, branchId: string): CreateTransactionDto {
    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.CASH_WITHDRAWAL_TO_PETTY_CASH;
    dto.branchId = branchId;
    dto.userId = userId;
    dto.bankAccountKey = this.bankAccountKey;
    dto.subtotal = this.amount;
    dto.taxAmount = 0;
    dto.discountAmount = 0;
    dto.total = this.amount;
    dto.paymentMethod = PaymentMethod.TRANSFER;
    dto.paymentStatus = PaymentStatus.PAID;
    dto.amountPaid = this.amount;
    dto.notes = this.notes;
    dto.metadata = {
      cashWithdrawalToPettyCash: true,
      occurredOn: this.occurredOn,
    };
    return dto;
  }
}
