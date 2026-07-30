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
 * Represents a remuneration/salary payment transaction
 */
@Entity('remunerations')
export class Remuneration {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_remunerations_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  transactionId!: string;

  @Column({ type: 'uuid', nullable: true })
  employeeId?: string;

  @Column({ type: 'decimal', precision: 19, scale: 2 })
  grossAmount!: number;

  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  deductions!: number;

  @Column({ type: 'decimal', precision: 19, scale: 2 })
  netAmount!: number;

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  status!: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Transaction, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'transactionId' })
  transaction?: Transaction;
}
