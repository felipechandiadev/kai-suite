import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TransactionOrmEntity } from '@modules/transactions/infrastructure/orm-mappers/transaction.orm-entity';

export enum InstallmentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export enum InstallmentSourceType {
  SALE = 'SALE',
  PURCHASE = 'PURCHASE',
  PAYROLL = 'PAYROLL',
  OPERATING_EXPENSE = 'OPERATING_EXPENSE',
  OTHER = 'OTHER',
}

@Entity('installments')
@Index(['saleTransactionId', 'installmentNumber'])
@Index(['sourceType', 'sourceTransactionId'])
@Index(['payeeType', 'payeeId'])
@Index(['dueDate'])
@Index(['status'])
export class InstallmentOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, default: 'SALE' })
  sourceType!: InstallmentSourceType;

  @Column({ type: 'uuid', nullable: true })
  sourceTransactionId!: string;

  @Column({ type: 'uuid', nullable: true })
  saleTransactionId?: string | null;

  @ManyToOne(() => TransactionOrmEntity)
  @JoinColumn({ name: 'saleTransactionId' })
  saleTransaction!: TransactionOrmEntity;

  @Column({ type: 'varchar', length: 50, nullable: true })
  payeeType?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  payeeId?: string;

  @Column({ type: 'int' })
  installmentNumber!: number;

  @Column({ type: 'int' })
  totalInstallments!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount!: number;

  @Column({ type: 'date' })
  dueDate!: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amountPaid!: number;

  @Column({ type: 'varchar', length: 50, default: InstallmentStatus.PENDING })
  status!: InstallmentStatus;

  @Column({ type: 'uuid', nullable: true })
  paymentTransactionId?: string;

  @ManyToOne(() => TransactionOrmEntity)
  @JoinColumn({ name: 'paymentTransactionId' })
  paymentTransaction?: TransactionOrmEntity;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;
}
