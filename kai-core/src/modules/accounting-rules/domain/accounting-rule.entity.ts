import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Company } from '@modules/companies/domain/company.entity';
import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { ExpenseCategory } from '@modules/expense-categories/domain/expense-category.entity';
import { Tax } from '@modules/taxes/domain/tax.entity';
import {
  TransactionType,
  PaymentMethod,
} from '@modules/transactions/domain/transaction.entity';
import { AccountingRuleLine } from './accounting-rule-line.entity';

/**
 * Base del monto de una regla por línea:
 * - LINE_TOTAL: total de la línea (comportamiento histórico).
 * - LINE_COST: costo de lo movido = `unitCost × quantity` (unitCost va por la unidad de la línea) (costo de ventas).
 */
export enum RuleAmountBasis {
  LINE_TOTAL = 'LINE_TOTAL',
  LINE_COST = 'LINE_COST',
}

export enum RuleScope {
  TRANSACTION = 'TRANSACTION',
  TRANSACTION_LINE = 'TRANSACTION_LINE',
}

@Entity('accounting_rules')
export class AccountingRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'enum', enum: RuleScope })
  appliesTo!: RuleScope;

  @Column({ type: 'enum', enum: TransactionType })
  transactionType!: TransactionType;

  @Column({ type: 'uuid', nullable: true })
  expenseCategoryId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  taxId?: string | null;

  @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
  paymentMethod?: PaymentMethod | null;

  @Column({ type: 'uuid' })
  debitAccountId!: string;

  @Column({ type: 'uuid' })
  creditAccountId!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: RuleAmountBasis.LINE_TOTAL,
  })
  amountBasis!: RuleAmountBasis;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @ManyToOne(() => ExpenseCategory, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'expenseCategoryId' })
  expenseCategory?: ExpenseCategory | null;

  @ManyToOne(() => Tax, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'taxId' })
  tax?: Tax | null;

  @ManyToOne(() => AccountingAccount, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'debitAccountId' })
  debitAccount!: AccountingAccount;

  @ManyToOne(() => AccountingAccount, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'creditAccountId' })
  creditAccount!: AccountingAccount;

  @OneToMany(() => AccountingRuleLine, (l) => l.rule)
  lines?: AccountingRuleLine[];
}
