import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { CompanyOrmEntity as Company } from '@modules/companies/infrastructure/orm-mappers/company.orm-entity';
import { AccountingAccountOrmEntity as AccountingAccount } from '@modules/accounting-accounts/infrastructure/orm-mappers/accounting-account.orm-entity';
import { AccountingPeriodOrmEntity as AccountingPeriod } from '@modules/accounting-periods/infrastructure/orm-mappers/accounting-period.orm-entity';

@Entity('account_balances')
@Unique('UQ_account_balance_account_period', ['accountId', 'periodId'])
@Index(['companyId', 'periodId'])
@Index(['accountId', 'periodId'])
export class AccountBalanceOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  accountId!: string;

  @Column({ type: 'uuid' })
  periodId!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  openingDebit!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  openingCredit!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  periodDebit!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  periodCredit!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  closingDebit!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  closingCredit!: number;

  @Column({ type: 'boolean', default: false })
  frozen!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  frozenAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @ManyToOne(() => AccountingAccount, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'accountId' })
  account!: AccountingAccount;

  @ManyToOne(() => AccountingPeriod, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'periodId' })
  period!: AccountingPeriod;
}
