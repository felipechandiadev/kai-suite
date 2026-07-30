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
 * Represents a bank movement event (incoming or outgoing transaction)
 */
@Entity('bank_movements')
export class BankMovement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_bank_movements_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  transactionId!: string;

  @Column({ type: 'varchar', length: 50 })
  direction!: 'IN' | 'OUT';

  @Column({ type: 'varchar', length: 100, nullable: true })
  bankAccount?: string;

  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  amount!: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Transaction, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'transactionId' })
  transaction?: Transaction;
}
