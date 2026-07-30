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
  Unique,
} from 'typeorm';
import { Company } from '@modules/companies/domain/company.entity';
import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { AccountingPeriod } from '@modules/accounting-periods/domain/accounting-period.entity';

/**
 * PHASE 2: Account Balance Aggregation Table
 *
 * This entity stores pre-calculated balances for each account per period.
 * Instead of calculating balances by summing all ledger entries (O(n)),
 * we maintain running balances (O(1) lookup).
 *
 * Expected Performance Improvement: 300x faster (30s -> 100ms)
 *
 * Key Features:
 * - Incremental balance updates on transaction creation
 * - Period closure freezes balances for immutability
 * - Opening balance = previous period's closing balance
 * - Supports both debit and credit balance types
 */
@Entity('account_balances')
@Unique('UQ_account_balance_account_period', ['accountId', 'periodId'])
@Index(['companyId', 'periodId'])
@Index(['accountId', 'periodId'])
export class AccountBalance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  accountId!: string;

  @Column({ type: 'uuid' })
  periodId!: string;

  // Opening balance (from previous period)
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  openingDebit!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  openingCredit!: number;

  // Period movements (sum of all ledger entries in this period)
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  periodDebit!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  periodCredit!: number;

  // Closing balance (opening + period movements)
  // Recalculated on period closure for immutability
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  closingDebit!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  closingCredit!: number;

  // Indicates if this balance is frozen (period closed)
  @Column({ type: 'boolean', default: false })
  frozen!: boolean;

  // Timestamp when balance was frozen
  @Column({ type: 'timestamp', nullable: true })
  frozenAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @ManyToOne(() => AccountingAccount, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'accountId' })
  account!: AccountingAccount;

  @ManyToOne(() => AccountingPeriod, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'periodId' })
  period!: AccountingPeriod;

  // Computed properties
  get netBalance(): number {
    return (this.closingDebit || 0) - (this.closingCredit || 0);
  }

  get periodMovement(): number {
    return (this.periodDebit || 0) - (this.periodCredit || 0);
  }
}
