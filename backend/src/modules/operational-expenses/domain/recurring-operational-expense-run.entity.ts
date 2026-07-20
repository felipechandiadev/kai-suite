import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Company } from '@modules/companies/domain/company.entity';
import { RecurringOperationalExpense } from './recurring-operational-expense.entity';
import { OperationalExpense } from './operational-expense.entity';

export enum RecurringOperationalExpenseRunStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

@Entity('recurring_operational_expense_runs')
@Unique('uq_recurring_oe_run_period', ['recurringExpenseId', 'periodKey'])
@Index('idx_recurring_oe_runs_template', ['recurringExpenseId', 'ranAt'])
export class RecurringOperationalExpenseRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  recurringExpenseId!: string;

  @Column({ type: 'varchar', length: 32 })
  periodKey!: string;

  @Column({ type: 'uuid', nullable: true })
  operationalExpenseId?: string | null;

  @Column({
    type: 'enum',
    enum: RecurringOperationalExpenseRunStatus,
    enumName: 'recurring_operational_expense_runs_status_enum',
  })
  status!: RecurringOperationalExpenseRunStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string | null;

  @Column({ type: 'timestamptz' })
  ranAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @ManyToOne(() => RecurringOperationalExpense, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recurringExpenseId' })
  recurringExpense!: RecurringOperationalExpense;

  @ManyToOne(() => OperationalExpense, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'operationalExpenseId' })
  operationalExpense?: OperationalExpense | null;
}
