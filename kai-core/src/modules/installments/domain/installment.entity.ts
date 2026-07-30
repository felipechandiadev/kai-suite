import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Transaction } from '@modules/transactions/domain/transaction.entity';

/**
 * ENTIDAD: Installment (Cuotas/Obligaciones de Pago)
 *
 * Representa CUALQUIER obligación de pago de la empresa:
 * - Cuentas por cobrar (SALE - ventas a plazo a clientes)
 * - Cuentas por pagar (PURCHASE - compras a proveedores)
 * - Remuneraciones (PAYROLL - sueldos a empleados)
 * - Gastos operativos (OPERATING_EXPENSE - gastos diversos)
 *
 * Esta tabla centraliza el control de tesorería y flujo de caja.
 *
 * Convive con transacciones SUPPLIER_PAYMENT (compromisos/pagos hacia documento
 * fiscal): evitar dos fuentes de verdad sin sincronizar — o bien el plan vive
 * en cuotas y el pago ejecuta contra ellas, o las cuotas reflejan esos compromisos.
 *
 * Casos de Uso:
 * ------------
 *
 * 1. VENTA a plazo $300,000 en 3 cuotas:
 *    - Cuota 1: $100,000, vence 30/03/2026, cliente debe
 *    - Cuota 2: $100,000, vence 30/04/2026, cliente debe
 *    - Cuota 3: $100,000, vence 30/05/2026, cliente debe
 *
 * 2. COMPRA a proveedor $500,000 en 2 pagos:
 *    - Pago 1: $250,000, vence 15/03/2026, empresa debe
 *    - Pago 2: $250,000, vence 15/04/2026, empresa debe
 *
 * 3. REMUNERACIÓN empleado $800,000:
 *    - Pago único: $800,000, vence 01/03/2026, empresa debe
 *
 * 4. GASTO OPERATIVO $150,000:
 *    - Pago único: $150,000, vence 10/03/2026, empresa debe
 */
export enum InstallmentStatus {
  PENDING = 'PENDING', // Sin pagar (o sin cobrar)
  PARTIAL = 'PARTIAL', // Pagado parcialmente
  PAID = 'PAID', // Pagado completamente
  OVERDUE = 'OVERDUE', // Vencido sin pagar (morosidad)
}

/**
 * Tipo de transacción origen de la obligación
 */
export enum InstallmentSourceType {
  SALE = 'SALE', // Venta (cobrar a cliente)
  PURCHASE = 'PURCHASE', // Compra (pagar a proveedor)
  PAYROLL = 'PAYROLL', // Remuneración (pagar a empleado)
  OPERATING_EXPENSE = 'OPERATING_EXPENSE', // Gasto operativo (pagar)
  OTHER = 'OTHER', // Otros
}

@Entity('installments')
@Index(['saleTransactionId', 'installmentNumber']) // Legacy: Buscar cuota específica de venta
@Index(['sourceType', 'sourceTransactionId']) // Buscar cuotas por origen genérico
@Index(['payeeType', 'payeeId']) // Buscar obligaciones por beneficiario
@Index(['dueDate']) // Reporte de morosidad
@Index(['status']) // Filtro por estado
@Index('idx_installments_company_id', ['companyId'])
export class Installment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  // ===== SOURCE: De dónde viene esta obligación =====

  /**
   * Tipo de transacción origen
   * - SALE: obligación de COBRO (cliente nos debe)
   * - PURCHASE: obligación de PAGO (debemos a proveedor)
   * - PAYROLL: obligación de PAGO (debemos sueldo a empleado)
   * - OPERATING_EXPENSE: obligación de PAGO (debemos gasto)
   */
  @Column({
    type: 'varchar',
    length: 50,
    default: 'SALE', // Para compatibilidad con datos existentes
  })
  sourceType!: InstallmentSourceType;

  /**
   * ID de la transacción origen (genérico)
   * Reemplaza saleTransactionId para soportar cualquier tipo
   */
  @Column({ type: 'uuid', nullable: true })
  sourceTransactionId!: string;

  /**
   * @deprecated Usar sourceTransactionId + sourceType = 'SALE'
   * Mantenido por compatibilidad con código legacy de ventas
   */
  @Column({ type: 'uuid', nullable: true })
  saleTransactionId?: string | null;

  @ManyToOne(() => Transaction)
  @JoinColumn({ name: 'saleTransactionId' })
  saleTransaction!: Transaction;

  // ===== PAYEE: A quién se le debe pagar (o cobrar) =====

  /**
   * Tipo de beneficiario/deudor
   * - CUSTOMER: Cliente (para SALE - nos debe)
   * - SUPPLIER: Proveedor (para PURCHASE - le debemos)
   * - EMPLOYEE: Empleado (para PAYROLL - le debemos)
   * - OTHER: Otros
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  payeeType?: string;

  /**
   * ID del beneficiario/deudor según payeeType
   * - Si payeeType = CUSTOMER: customerId
   * - Si payeeType = SUPPLIER: supplierId
   * - Si payeeType = EMPLOYEE: employeeId
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  payeeId?: string;

  /**
   * Número de cuota: 1, 2, 3, etc
   * Junto con saleTransactionId, forma el identificador de la cuota
   */
  @Column({ type: 'int' })
  installmentNumber!: number;

  /**
   * Total de cuotas pactadas
   * Ej: 3 (para venta en 3 cuotas)
   * Informativo para validaciones
   */
  @Column({ type: 'int' })
  totalInstallments!: number;

  /**
   * Monto de la cuota individual
   * Ej: $100,000 (si venta total es $300,000 en 3 cuotas)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount!: number;

  /**
   * Fecha de vencimiento de la cuota
   * Ej: 30/03/2026 para cuota 1
   */
  @Column({ type: 'date' })
  dueDate!: Date;

  /**
   * Monto pagado de la cuota
   * - PENDING: 0
   * - PARTIAL: Entre 0 y amount
   * - PAID: amount (igual a amount)
   * - OVERDUE: >= amount (puede tener intereses)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amountPaid!: number;

  /**
   * Estado de la cuota
   */
  @Column({
    type: 'enum',
    enum: InstallmentStatus,
    default: InstallmentStatus.PENDING,
  })
  status!: InstallmentStatus;

  /**
   * Referencia al transaction PAYMENT_IN que pagó esta cuota
   *
   * Cuando se registra PAYMENT_IN asociado a esta cuota:
   * 1. Se actualiza amountPaid
   * 2. Se actualiza paymentTransactionId
   * 3. Se calcula nuevo status (PAID o PARTIAL)
   *
   * Nota: Es nullable porque la cuota puede no estar pagada aún
   */
  @Column({ type: 'uuid', nullable: true })
  paymentTransactionId?: string;

  @ManyToOne(() => Transaction)
  @JoinColumn({ name: 'paymentTransactionId' })
  paymentTransaction?: Transaction;

  /**
   * Información de pagos adicionales (intereses, ajustes)
   * @example
   * {
   *   "interestCharged": 5000,
   *   "interestReason": "late_payment",
   *   "adjustmentReason": "customer_request",
   *   "notes": "Se otorgó 15 días de gracia"
   * }
   */
  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  /**
   * Fecha de creación de la cuota
   * (no es modificable)
   */
  @CreateDateColumn()
  createdAt!: Date;

  // Propiedades calculadas (no persisten en BD)

  /**
   * Calcula el saldo pendiente de la cuota
   */
  getPendingAmount(): number {
    return Math.max(0, this.amount - this.amountPaid);
  }

  /**
   * Indica si la cuota está en mora
   * (considerando fecha actual y saldo)
   */
  isOverdue(today: Date = new Date()): boolean {
    return today > this.dueDate && this.getPendingAmount() > 0;
  }

  /**
   * Calcula días de atraso
   */
  getDaysOverdue(today: Date = new Date()): number {
    if (!this.isOverdue(today)) return 0;
    const diffTime = Math.abs(today.getTime() - this.dueDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
