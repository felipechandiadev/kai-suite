import 'reflect-metadata';
import { TransactionOrmEntity } from '../infrastructure/orm-mappers/transaction.orm-entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Branch } from '@modules/branches/domain/branch.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { CashSession } from '@modules/cash-sessions/domain/cash-session.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { User } from '@modules/users/domain/user.entity';
import { ExpenseCategory } from '@modules/expense-categories/domain/expense-category.entity';
import { ResultCenter } from '@modules/result-centers/domain/result-center.entity';
import { Shareholder } from '@modules/shareholders/domain/shareholder.entity';
import { AccountingPeriod } from '@modules/accounting-periods/domain/accounting-period.entity';
import { Employee } from '@modules/employees/domain/employee.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import type { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { Installment } from '@modules/installments/domain/installment.entity';

/**
 * TIPOS DE TRANSACCIONES - Sistema Flow Store
 *
 * 22 tipos organizados en 8 categorías:
 *
 * 1. VENTAS Y DEVOLUCIONES (3 tipos)
 *    SALE: Venta a cliente (contado o crédito)
 *    SALE_RETURN: Devolución de venta con referencia a SALE original (líneas, stock)
 *    CUSTOMER_CREDIT_NOTE: Nota de crédito al cliente (documento fiscal/contable; sin líneas)
 *
 * 2. COMPRAS Y DEVOLUCIONES (6 tipos)
 *    PURCHASE: Compra a proveedor
 *    PURCHASE_ORDER: Orden de compra (no afecta inventario aún)
 *    PURCHASE_RETURN: Devolución a proveedor (stock / reverso operativo)
 *    SUPPLIER_INVOICE: Factura de proveedor
 *    SUPPLIER_RECEIPT: Boleta de proveedor
 *    SUPPLIER_HONORARIUM_RECEIPT: Boleta de honorarios de proveedor
 *    SUPPLIER_GUIDE: Guía de despacho de proveedor
 *    SUPPLIER_CREDIT_NOTE: Nota de crédito de proveedor (documento fiscal; asociada a PURCHASE_RETURN)
 *
 * 3. MOVIMIENTOS DE INVENTARIO (8 tipos)
 *    TRANSFER_OUT: Salida de transferencia entre bodegas
 *    TRANSFER_IN: Entrada de transferencia (par inseparable de TRANSFER_OUT)
 *    ADJUSTMENT_IN: Ajuste positivo de inventario
 *    ADJUSTMENT_OUT: Ajuste negativo de inventario
 *    INVENTORY_COUNT: Conteo físico con diferencias automáticas
 *    INVENTORY_RESERVATION: Reserva de stock para pedidos
 *    INVENTORY_BLOCK: Bloqueo por calidad/calibración
 *    INVENTORY_UNBLOCK: Liberación de bloqueos
 *
 * 4. PAGOS Y COBROS
 *    PAYMENT_IN: Cobro de cliente (venta a plazo)
 *    SUPPLIER_PAYMENT: Compromiso o ejecución de pago a proveedor (vinculado a compra / factura / boleta proveedor)
 *    PAYROLL_PAYMENT: Compromiso o ejecución de pago de remuneraciones (empleado / liquidación)
 *    EXPENSE_PAYMENT: Pago de gastos operativos
 *    BANK_TO_CASH_TRANSFER: Giro banco → caja (tesorería interna; antes metadata.bankToCashTransfer sobre PAYMENT_OUT)
 *
 * 5. NÓMINA Y REMUNERACIONES (2 tipos)
 *    PAYROLL: Liquidación de nómina (genera CxP por salarios)
 *    PAYMENT_EXECUTION: Ejecución de pago de nómina (referencia a PAYROLL)
 *
 * 6. ANULACIONES Y AJUSTES (1 tipo)
 *    VOID_ADJUSTMENT: Anulación trazable con metadata completa
 *
 * 7. GESTIÓN DE CAJA (4 tipos)
 *    CASH_SESSION_OPENING: Apertura de sesión
 *    CASH_SESSION_CLOSING: Cierre de sesión
 *    CASH_SESSION_WITHDRAWAL: Retiro de efectivo de sesión
 *    CASH_SESSION_DEPOSIT: Ingreso de efectivo a sesión
 *
 * 7. GASTOS OPERATIVOS (2 tipos)
 *    OPERATING_EXPENSE: Gasto directo (café, mantenimiento, etc)
 *    CASH_DEPOSIT: Depósito de efectivo en banco
 *
 * 8. CAPITAL Y TESORERÍA (4 tipos)
 *    CAPITAL_CONTRIBUTION: Aporte de capital (socio → banco / capital)
 *    BANK_WITHDRAWAL_TO_SHAREHOLDER: Retiro de utilidades / egreso a socio
 *    CASH_WITHDRAWAL_TO_PETTY_CASH: Giro banco → caja (fondo fijo / sencillado)
 *    (CASH_DEPOSIT ya listado arriba: caja → banco)
 *
 * @see docs/TRANSACTION_TYPES_ANALYSIS.md - Análisis detallado
 */
export enum TransactionType {
  // Ventas y Devoluciones
  SALE = 'SALE',
  SALE_RETURN = 'SALE_RETURN',
  /** Nota de crédito a cliente; montos y vínculos; detalle en SALE_RETURN. */
  CUSTOMER_CREDIT_NOTE = 'CUSTOMER_CREDIT_NOTE',
  /**
   * Pago en caja al cliente por liquidación del saldo disponible de una o más NC
   * (`metadata.allocations[]` con `creditNoteId`). Egreso de efectivo en sesión.
   */
  CUSTOMER_CREDIT_NOTE_PAYOUT = 'CUSTOMER_CREDIT_NOTE_PAYOUT',

  // Compras y Devoluciones
  PURCHASE = 'PURCHASE',
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  PURCHASE_RETURN = 'PURCHASE_RETURN',
  SUPPLIER_INVOICE = 'SUPPLIER_INVOICE',
  SUPPLIER_RECEIPT = 'SUPPLIER_RECEIPT',
  SUPPLIER_HONORARIUM_RECEIPT = 'SUPPLIER_HONORARIUM_RECEIPT',
  SUPPLIER_GUIDE = 'SUPPLIER_GUIDE',
  SUPPLIER_CREDIT_NOTE = 'SUPPLIER_CREDIT_NOTE',

  // Pedidos / Ejecución (no mueven stock por sí solos)
  CUSTOMER_ORDER = 'CUSTOMER_ORDER',
  SERVICE_ORDER = 'SERVICE_ORDER',
  PRODUCTION_BATCH = 'PRODUCTION_BATCH',
  /** Cotización: estructura de carrito sin efecto contable ni stock. */
  QUOTATION = 'QUOTATION',
  /**
   * Reserva / backorder: pedido de cliente sin stock, con **anticipo**
   * (`metadata.backorder.depositAmount`) reutilizable luego como medio de pago.
   * Detalle en líneas como venta; **no descuenta inventario** por sí sola.
   * @see `TransactionBackorderMetadata` en `transaction-backorder.metadata.ts`
   */
  BACKORDER = 'BACKORDER',

  // Movimientos de Inventario
  TRANSFER_OUT = 'TRANSFER_OUT',
  TRANSFER_IN = 'TRANSFER_IN',
  ADJUSTMENT_IN = 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT = 'ADJUSTMENT_OUT',
  INVENTORY_COUNT = 'INVENTORY_COUNT',
  INVENTORY_RESERVATION = 'INVENTORY_RESERVATION',
  INVENTORY_BLOCK = 'INVENTORY_BLOCK',
  INVENTORY_UNBLOCK = 'INVENTORY_UNBLOCK',

  // Pagos y Cobros
  PAYMENT_IN = 'PAYMENT_IN',
  SUPPLIER_PAYMENT = 'SUPPLIER_PAYMENT',
  PAYROLL_PAYMENT = 'PAYROLL_PAYMENT',
  EXPENSE_PAYMENT = 'EXPENSE_PAYMENT',
  /** Banco → caja (tesorería); no es pago a tercero. */
  BANK_TO_CASH_TRANSFER = 'BANK_TO_CASH_TRANSFER',

  // Nómina
  PAYROLL = 'PAYROLL',
  PAYMENT_EXECUTION = 'PAYMENT_EXECUTION',

  // Anulaciones
  VOID_ADJUSTMENT = 'VOID_ADJUSTMENT',

  // Caja
  CASH_DEPOSIT = 'CASH_DEPOSIT',
  OPERATING_EXPENSE = 'OPERATING_EXPENSE',
  CASH_SESSION_OPENING = 'CASH_SESSION_OPENING',
  CASH_SESSION_CLOSING = 'CASH_SESSION_CLOSING',
  /** Efectivo de cierre de sesión / POS hacia centro de acopio (1110 vs 1101). */
  CASH_SESSION_TO_HUB_TRANSFER = 'CASH_SESSION_TO_HUB_TRANSFER',
  CASH_SESSION_WITHDRAWAL = 'CASH_SESSION_WITHDRAWAL',
  CASH_SESSION_DEPOSIT = 'CASH_SESSION_DEPOSIT',

  // Capital / tesorería socios
  CAPITAL_CONTRIBUTION = 'CAPITAL_CONTRIBUTION',
  BANK_WITHDRAWAL_TO_SHAREHOLDER = 'BANK_WITHDRAWAL_TO_SHAREHOLDER',
  CASH_WITHDRAWAL_TO_PETTY_CASH = 'CASH_WITHDRAWAL_TO_PETTY_CASH',
}

// Expose class on globalThis so relation thunks that resolve at runtime (in bundled builds)
// can find the constructor without relying on string names or require() resolution.

export enum TransactionStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  VOIDED = 'VOIDED',
  PENDING = 'PENDING',
  /**
   * Estado materializable para cotizaciones cuya `validUntil` ya pasó.
   * El sistema también lo deriva al vuelo en queries (`effectiveStatus`)
   * cuando `status=CONFIRMED` y `metadata.quotation.validUntil < now()`.
   */
  EXPIRED = 'EXPIRED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  TRANSFER = 'TRANSFER',
  CHECK = 'CHECK',
  CREDIT = 'CREDIT',
  INTERNAL_CREDIT = 'INTERNAL_CREDIT',
  /** Cliente paga con nota de crédito emitida a su favor. */
  CUSTOMER_CREDIT_NOTE = 'CUSTOMER_CREDIT_NOTE',
  /** Anticipo de cliente por encargo / pedido especial. */
  ORDER_ADVANCE = 'ORDER_ADVANCE',
  /**
   * Documento/voucher de tercero (p.ej. vale gas, vale almuerzo).
   * Monto + referencia (Nº) + `voucherData` (tipo/emisor/valor nominal).
   */
  VOUCHER = 'VOUCHER',
  /**
   * @deprecated Histórico en BD. Pagos múltiples se expresan en `metadata.payments[]`;
   * la columna `paymentMethod` guarda el medio representativo (mayor monto).
   */
  MIXED = 'MIXED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  OVERDUE = 'OVERDUE',
  VOIDED = 'VOIDED',
}

/**
 * ENTIDAD CENTRAL E INMUTABLE
 *
 * Transaction es el corazón del sistema. Cada operación comercial
 * genera un registro inmutable que no puede ser modificado ni eliminado.
 * Las correcciones se hacen mediante nuevas transacciones de anulación
 * o ajuste que referencian a la original.
 */
@Entity('transactions')
@Index(['transactionType', 'createdAt'])
@Index(['branchId', 'createdAt'])
@Index(['documentNumber'])
@Index('idx_transactions_company_id', ['companyId'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  // Número de documento único por sucursal y tipo
  @Column({ type: 'varchar', length: 50 })
  documentNumber!: string;

  @Column({ type: 'enum', enum: TransactionType })
  transactionType!: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.CONFIRMED,
  })
  status!: TransactionStatus;

  // Referencias de ubicación
  @Column({ type: 'uuid', nullable: true })
  branchId?: string;

  @Column({ type: 'uuid', nullable: true })
  pointOfSaleId?: string;

  @Column({ type: 'uuid', nullable: true })
  cashSessionId?: string;

  @Column({ type: 'uuid', nullable: true })
  storageId?: string;

  // Para transferencias: bodega destino
  @Column({ type: 'uuid', nullable: true })
  targetStorageId?: string;

  // Actores
  @Column({ type: 'uuid', nullable: true })
  customerId?: string;

  @Column({ type: 'uuid', nullable: true })
  supplierId?: string;

  @Column({ type: 'uuid', nullable: true })
  shareholderId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  employeeId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  expenseCategoryId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  resultCenterId?: string | null;

  @Column({ type: 'uuid' })
  userId!: string;

  // Montos
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  taxAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  discountAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total!: number;

  // --- NORMALIZACIÓN ERP ---
  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bankAccountKey?: string;

  /** Centro de acopio: depósito bancario desde hub o movimiento asociado al hub. */
  @Column({ type: 'uuid', nullable: true })
  cashHubId?: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  documentType?: string; // Ej: Factura, Boleta, Guía

  @Column({ type: 'varchar', length: 50, nullable: true })
  documentFolio?: string; // Número externo del documento

  @Column({ type: 'timestamp', nullable: true })
  paymentDueDate?: Date; // Vencimiento de la deuda

  @Column({ type: 'enum', enum: PaymentStatus, nullable: true })
  paymentStatus?: PaymentStatus;

  @Column({ type: 'uuid', nullable: true })
  accountingPeriodId?: string;

  // -------------------------

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amountPaid!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  changeAmount?: number;

  // Referencias
  @Column({ type: 'uuid', nullable: true })
  relatedTransactionId?: string;

  /**
   * FASE 2: Jerarquía parent-children (optional)
   * Permite modelar transacciones compuestas:
   * - PAYROLL (padre) → múltiples PAYMENT_EXECUTION (hijos)
   * - SALE (padre) → múltiples PAYMENT_IN (hijos) para venta a plazo
   * - Transacción original → VOID_ADJUSTMENT (hijo que la anula)
   * @see docs/TRANSACTION_TYPES_ANALYSIS.md#recomendación-1
   */
  @Column({ type: 'uuid', nullable: true })
  parentTransactionId?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  externalReference?: string;

  // Metadatos
  @Column({ type: 'text', nullable: true })
  notes?: string;

  /**
   * JSON libre por tipo. Convenciones:
   * - `QUOTATION`: `metadata.quotation` (vigencia, conversión, …)
   * - `BACKORDER`: `metadata.backorder` — ver `TransactionBackorderMetadata`
   */
  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  // INMUTABLE: Solo fecha de creación, no se puede modificar
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  // Relations
  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branchId' })
  branch?: Branch;

  @ManyToOne(() => PointOfSale, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pointOfSaleId' })
  pointOfSale?: PointOfSale;

  @ManyToOne(() => CashSession, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cashSessionId' })
  cashSession?: CashSession;

  @ManyToOne(() => Storage, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'storageId' })
  storageEntry?: any;

  @ManyToOne(() => Storage, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'targetStorageId' })
  targetStorageEntry?: any;

  @ManyToOne(() => Customer, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customerId' })
  customer?: Customer;

  @ManyToOne(() => Supplier, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplierId' })
  supplier?: Supplier;

  @ManyToOne(() => Shareholder, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'shareholderId' })
  shareholder?: Shareholder | null;

  @ManyToOne(() => Employee, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'employeeId' })
  employee?: Employee | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => ExpenseCategory, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'expenseCategoryId' })
  expenseCategory?: ExpenseCategory | null;

  @ManyToOne(() => ResultCenter, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resultCenterId' })
  resultCenter?: ResultCenter | null;

  @ManyToOne(() => AccountingPeriod, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'accountingPeriodId' })
  accountingPeriod?: AccountingPeriod;

  @ManyToOne(() => Transaction, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'relatedTransactionId' })
  relatedTransaction?: Transaction;

  /**
   * Relaciones inversas: transacciones que referencian a esta
   * Permite consultas bidireccionales eficientes
   * @example
   * // Encontrar todos los pagos relacionados con una venta
   * const sale = await repo.findOne(id, { relations: ['inverseRelations'] });
   * const payments = sale.inverseRelations; // PAYMENT_IN, PAYMENT_EXECUTION, etc.
   */
  @OneToMany(() => Transaction, (t) => t.relatedTransaction)
  inverseRelations?: Transaction[];

  /**
   * FASE 2: Jerarquía parent-children (optional)
   * Relación inversa: permite consultar "quién referencia a esta transacción"
   * @example
   * // Query PAYROLL y obtener todos los PAYMENT_EXECUTION asociados
   * const payroll = await repo.findOne(id, { relations: ['children'] });
   * const payments = payroll.children; // PAYMENT_EXECUTION[]
   * @see docs/TRANSACTION_TYPES_ANALYSIS.md#recomendación-1
   */
  @ManyToOne(() => Transaction, (t) => t.children, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentTransactionId' })
  parent?: Transaction;

  @OneToMany(() => Transaction, (t) => t.parent)
  children?: Transaction[];

  @OneToMany(() => Installment, (i) => i.saleTransaction)
  installments?: Installment[];

  // Use globalThis lookup for TransactionLine to avoid constructor-identity/minification issues and prevent circular imports
  @OneToMany(
    () => (globalThis as any).TransactionLine,
    (line: TransactionLine) => line.transaction,
  )
  lines!: TransactionLine[];

  // Static factory method for creating domain objects from ORM entities
  static fromOrmEntity(ormEntity: TransactionOrmEntity): Transaction {
    // Cast string fields to proper enum types
    const transaction = ormEntity as any;
    transaction.transactionType =
      transaction.transactionType as TransactionType;
    transaction.status = transaction.status as TransactionStatus;
    return transaction as Transaction;
  }
}

export type {
  BackorderReservationStatus,
  TransactionBackorderCustomerSnapshot,
  TransactionBackorderMetadata,
} from './transaction-backorder.metadata';

(globalThis as any).Transaction = Transaction;
