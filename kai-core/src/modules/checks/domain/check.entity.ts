import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Transaction } from '@modules/transactions/domain/transaction.entity';

export enum CheckDirection {
  /** Cheque recibido como pago (cliente -> empresa). */
  INCOMING = 'INCOMING',
  /** Cheque emitido por la empresa para pagar a un tercero. */
  OUTGOING = 'OUTGOING',
}

export enum CheckStatus {
  /** Recibido o emitido, todavía no depositado/cobrado. */
  PENDING = 'PENDING',
  /** INCOMING ya depositado, a la espera de que el banco lo cobre. */
  DEPOSITED = 'DEPOSITED',
  /** El dinero efectivamente cambió de manos (banco cargó/abonó). */
  CLEARED = 'CLEARED',
  /** Protestado / rechazado por el banco. */
  BOUNCED = 'BOUNCED',
  /** Anulado administrativamente. */
  VOIDED = 'VOIDED',
  /** Endosado a un tercero como pago (sale de la cartera entrante). */
  ENDORSED = 'ENDORSED',
}

/**
 * Cheque tangible con ciclo de vida propio. Vive más allá de la
 * transacción que lo origina porque puede cambiar de estado varias
 * veces (depósito, cobro, protesto, endoso, anulación).
 */
@Entity('checks')
@Index('idx_checks_company_status_direction', [
  'companyId',
  'status',
  'direction',
])
@Index('idx_checks_company_due_date', ['companyId', 'dueDate'])
@Index('idx_checks_transaction_id', ['transactionId'])
@Index('idx_checks_check_number_bank', ['checkNumber', 'bankName'])
export class Check {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_checks_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'enum', enum: CheckDirection })
  direction!: CheckDirection;

  @Column({ type: 'enum', enum: CheckStatus, default: CheckStatus.PENDING })
  status!: CheckStatus;

  /** Datos del documento físico. */
  @Column({ type: 'varchar', length: 50 })
  checkNumber!: string;

  @Column({ type: 'varchar', length: 120 })
  bankName!: string;

  /** Para OUTGOING: la cuenta propia desde la que se gira. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  bankAccountKey?: string | null;

  /** Girador (quien firma): solo INCOMING tiene este dato del cliente. */
  @Column({ type: 'varchar', length: 200, nullable: true })
  drawerName?: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  drawerDocument?: string | null;

  /** Beneficiario (a quien se le emite/endosa). */
  @Column({ type: 'varchar', length: 200, nullable: true })
  payeeName?: string | null;

  @Column({ type: 'uuid', nullable: true })
  payeeId?: string | null;

  @Column({ type: 'decimal', precision: 19, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 10, default: 'CLP' })
  currency!: string;

  @Column({ type: 'date' })
  issueDate!: string;

  /** Para cheques "a fecha" (postdated). */
  @Column({ type: 'date', nullable: true })
  dueDate?: string | null;

  @Column({ type: 'date', nullable: true })
  depositDate?: string | null;

  @Column({ type: 'date', nullable: true })
  clearedDate?: string | null;

  @Column({ type: 'text', nullable: true })
  bouncedReason?: string | null;

  /** Transacción que originó el cheque (venta para INCOMING, pago para OUTGOING). */
  @Column({ type: 'uuid', nullable: true })
  transactionId?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date | null;

  @ManyToOne(() => Transaction, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'transactionId' })
  transaction?: Transaction | null;
}
