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
 * Represents a bank withdrawal transaction
 */
@Entity('bank_withdrawals')
export class BankWithdrawal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_bank_withdrawals_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  transactionId!: string;

  @Column({ type: 'varchar', length: 100 })
  account!: string;

  @Column({ type: 'decimal', precision: 19, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  status!: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

  @Column({ type: 'text', nullable: true })
  purpose?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Transaction, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'transactionId' })
  transaction?: Transaction;
}
