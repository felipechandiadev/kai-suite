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
 * Represents a capital contribution transaction
 */
@Entity('capital_contributions')
export class CapitalContribution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_capital_contributions_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  transactionId!: string;

  @Column({ type: 'decimal', precision: 19, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  status!: 'PENDING' | 'COMPLETED' | 'REJECTED';

  @Column({ type: 'uuid', nullable: true })
  shareholderId?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Transaction, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'transactionId' })
  transaction?: Transaction;
}
