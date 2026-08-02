import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TipLedgerStatus {
  ACCRUED = 'ACCRUED',
  PAID = 'PAID',
  VOID = 'VOID',
}

export enum TipCaptureStatus {
  NONE = 'NONE',
  SUGGESTED = 'SUGGESTED',
  ACCEPTED = 'ACCEPTED',
  CUSTOM = 'CUSTOM',
  DECLINED = 'DECLINED',
}

@Entity('tip_ledger_entries')
@Index(['companyId', 'createdAt'])
@Index(['companyId', 'status'])
@Index(['companyId', 'dueAt'])
@Index(['companyId', 'employeeId'])
@Index(['saleTransactionId'], { unique: true })
export class TipLedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid', nullable: true })
  branchId?: string | null;

  @Column({ type: 'uuid' })
  saleTransactionId!: string;

  @Column({ type: 'uuid', nullable: true })
  diningOrderId?: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amount!: string;

  @Column({ type: 'varchar', length: 16, default: TipLedgerStatus.ACCRUED })
  status!: TipLedgerStatus;

  @Column({ type: 'varchar', length: 16, default: TipCaptureStatus.NONE })
  tipStatus!: TipCaptureStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  suggestPercent?: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  suggestedAmount?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  paymentMethod?: string | null;

  @Column({ type: 'uuid', nullable: true })
  employeeId?: string | null;

  /** Monto ya enterado a trabajadores (parcial o total). */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amountPaid!: string;

  /** Plazo legal tip tarjeta (createdAt + 7 días hábiles). */
  @Column({ type: 'timestamptz', nullable: true })
  dueAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  attributedAt?: Date | null;

  /** Lote TIP_PAYOUT (o PAYROLL) que cerró este asiento. */
  @Column({ type: 'uuid', nullable: true })
  payoutTransactionId?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
