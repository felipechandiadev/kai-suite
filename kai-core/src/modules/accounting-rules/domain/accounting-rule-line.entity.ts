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
import { AccountingRule } from './accounting-rule.entity';
import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';

export enum AccountingRuleLineSide {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum AccountingRuleLineAmountMode {
  TOTAL = 'TOTAL',
  SUBTOTAL = 'SUBTOTAL',
  TAX = 'TAX',
  DISCOUNT = 'DISCOUNT',
  FIXED = 'FIXED',
}

@Entity('accounting_rule_lines')
@Index(['ruleId', 'sortOrder'], { unique: true })
@Index('idx_accounting_rule_lines_company_id', ['companyId'])
export class AccountingRuleLine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  ruleId!: string;

  @Column({ type: 'enum', enum: AccountingRuleLineSide })
  side!: AccountingRuleLineSide;

  @Column({ type: 'uuid' })
  accountId!: string;

  @Column({ type: 'enum', enum: AccountingRuleLineAmountMode })
  amountMode!: AccountingRuleLineAmountMode;

  /** Solo aplica si amountMode=FIXED */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  amountValue?: number | null;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => AccountingRule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ruleId' })
  rule!: AccountingRule;

  @ManyToOne(() => AccountingAccount, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'accountId' })
  account!: AccountingAccount;
}

