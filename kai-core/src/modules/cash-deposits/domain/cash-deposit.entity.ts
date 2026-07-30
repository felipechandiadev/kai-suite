import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Transaction } from '@modules/transactions/domain/transaction.entity';

/**
 * Represents a cash deposit transaction
 */
@Entity('cash_deposits')
export class CashDeposit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_cash_deposits_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  transactionId!: string;

  @Column({ type: 'varchar', length: 100 })
  account!: string;

  @Column({ type: 'decimal', precision: 19, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  status!: 'PENDING' | 'COMPLETED' | 'FAILED';

  @Column({ type: 'text', nullable: true })
  depositorInfo?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Transaction, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'transactionId' })
  transaction?: Transaction;
}
