import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CompanyOrmEntity } from '@modules/companies/infrastructure/orm-mappers/company.orm-entity';
import { AccountingAccountOrmEntity } from '@modules/accounting-accounts/infrastructure/orm-mappers/accounting-account.orm-entity';
import { ExpenseCategoryOrmEntity } from '@modules/expense-categories/infrastructure/orm-mappers/expense-category.orm-entity';
import { TaxOrmEntity } from '@modules/taxes/infrastructure/orm-mappers/tax.orm-entity';
import {
  TransactionType,
  PaymentMethod,
} from '@modules/transactions/domain/transaction.entity';

export enum RuleScope {
  TRANSACTION = 'TRANSACTION',
  TRANSACTION_LINE = 'TRANSACTION_LINE',
}

@Entity('accounting_rules')
export class AccountingRuleOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid', nullable: true })
  expenseCategoryId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  taxId?: string | null;

  @Column({ type: 'varchar', length: 50 })
  appliesTo!: RuleScope;

  @Column({ type: 'varchar', length: 50 })
  transactionType!: TransactionType;
  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod?: PaymentMethod | null;

  @Column({ type: 'uuid' })
  debitAccountId!: string;

  @Column({ type: 'uuid' })
  creditAccountId!: string;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => CompanyOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: CompanyOrmEntity;

  @ManyToOne(() => ExpenseCategoryOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'expenseCategoryId' })
  expenseCategory?: ExpenseCategoryOrmEntity | null;

  @ManyToOne(() => TaxOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'taxId' })
  tax?: TaxOrmEntity | null;

  @ManyToOne(() => AccountingAccountOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'debitAccountId' })
  debitAccount!: AccountingAccountOrmEntity;

  @ManyToOne(() => AccountingAccountOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'creditAccountId' })
  creditAccount!: AccountingAccountOrmEntity;
}
