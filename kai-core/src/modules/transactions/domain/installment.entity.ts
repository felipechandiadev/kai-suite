import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Transaction } from './transaction.entity';

/**
 * Estados posibles de una cuota
 */
export enum InstallmentStatus {
  PENDING = 'PENDING',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  OVERDUE = 'OVERDUE',
}

/**
 * ENTIDAD INSTALLMENT - Cuotas de Pago
 *
 * Maneja pagos a plazos para transacciones de venta.
 * Permite seguimiento granular de cuotas individuales.
 *
 * @example
 * Venta de $3000 en 3 cuotas:
 * - Installment 1: $1000 (pagado)
 * - Installment 2: $1000 (pendiente)
 * - Installment 3: $1000 (pendiente)
 */
@Entity('installments')
@Index(['transactionId', 'dueDate'])
@Index(['status'])
export class Installment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Transacción padre (SALE o PURCHASE)
   */
  @Column({ type: 'uuid' })
  transactionId!: string;

  /**
   * Número de cuota (1, 2, 3, ...)
   */
  @Column({ type: 'int' })
  installmentNumber!: number;

  /**
   * Monto total de la cuota
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount!: number;

  /**
   * Monto pagado (puede ser parcial)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amountPaid!: number;

  /**
   * Fecha de vencimiento
   */
  @Column({ type: 'date' })
  dueDate!: Date;

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
   * ID de la transacción de pago que liquidó esta cuota
   * (PAYMENT_IN para ventas, SUPPLIER_PAYMENT para compras)
   */
  @Column({ type: 'uuid', nullable: true })
  paymentTransactionId?: string;

  /**
   * Fecha en que se pagó completamente
   */
  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  /**
   * Notas adicionales
   */
  @Column({ type: 'text', nullable: true })
  notes?: string;

  /**
   * Metadatos adicionales (intereses, recargos, etc.)
   */
  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Transaction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transactionId' })
  transaction?: Transaction;

  @ManyToOne(() => Transaction, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'paymentTransactionId' })
  paymentTransaction?: Transaction;

  // Business Logic Methods
  /**
   * Verifica si la cuota está vencida
   */
  isOverdue(): boolean {
    return (
      this.status === InstallmentStatus.PENDING && new Date() > this.dueDate
    );
  }

  /**
   * Calcula el monto pendiente
   */
  getPendingAmount(): number {
    return this.amount - this.amountPaid;
  }

  /**
   * Marca la cuota como pagada
   */
  markAsPaid(paymentTransactionId: string, paidAt: Date = new Date()): void {
    this.paymentTransactionId = paymentTransactionId;
    this.amountPaid = this.amount;
    this.paidAt = paidAt;
    this.status = InstallmentStatus.PAID;
  }

  /**
   * Registra un pago parcial
   */
  addPayment(amount: number, paymentTransactionId: string): void {
    this.amountPaid += amount;
    if (this.amountPaid >= this.amount) {
      this.markAsPaid(paymentTransactionId);
    } else {
      this.status = InstallmentStatus.PARTIALLY_PAID;
    }
  }
}
