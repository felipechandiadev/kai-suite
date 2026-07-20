import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '@modules/companies/domain/company.entity';
import { ExpenseCategory } from '@modules/expense-categories/domain/expense-category.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { User } from '@modules/users/domain/user.entity';
import { OperationalExpenseDocumentKind } from './operational-expense.entity';

export enum RecurringOperationalExpenseFrequency {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

@Entity('recurring_operational_expenses')
@Index('idx_recurring_oe_due', ['isActive', 'nextRunAt'])
export class RecurringOperationalExpense {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid', nullable: true })
  branchId?: string | null;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'uuid' })
  categoryId!: string;

  @Column({ type: 'uuid' })
  supplierId!: string;

  @Column({
    type: 'enum',
    enum: OperationalExpenseDocumentKind,
    enumName: 'operational_expenses_documentkind_enum',
    default: OperationalExpenseDocumentKind.OTHER,
  })
  documentKind!: OperationalExpenseDocumentKind;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amountNet!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  taxAmount!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total!: string;

  @Column({ type: 'uuid', nullable: true })
  taxId?: string | null;

  @Column({
    type: 'enum',
    enum: RecurringOperationalExpenseFrequency,
    enumName: 'recurring_operational_expenses_frequency_enum',
  })
  frequency!: RecurringOperationalExpenseFrequency;

  /** 0=Sunday … 6=Saturday (WEEKLY). */
  @Column({ type: 'smallint', nullable: true })
  dayOfWeek?: number | null;

  /** 1–28 (MONTHLY / YEARLY). */
  @Column({ type: 'smallint', nullable: true })
  dayOfMonth?: number | null;

  @Column({ type: 'timestamptz' })
  nextRunAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastRunAt?: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @ManyToOne(() => ExpenseCategory, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoryId' })
  category!: ExpenseCategory;

  @ManyToOne(() => Supplier, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplierId' })
  supplier!: Supplier;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'createdBy' })
  createdByUser!: User;
}
