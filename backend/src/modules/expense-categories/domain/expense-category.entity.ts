import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from '@modules/companies/domain/company.entity';
import { ResultCenter } from '@modules/result-centers/domain/result-center.entity';
import { ExpenseCategoryOperationalGroup } from './expense-category-operational-group.enum';
import { ExpenseCategoryPnlNature } from './expense-category-pnl-nature.enum';

@Entity('expense_categories')
export class ExpenseCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  /** Opcional en alta; si falta, el servicio asigna un código único (prefijo EC + UUID). */
  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  code?: string | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({
    name: 'operational_expense_group',
    type: 'enum',
    enum: ExpenseCategoryOperationalGroup,
    default: ExpenseCategoryOperationalGroup.PERDIDAS_AJUSTES_OPERATIVOS,
  })
  operationalExpenseGroup!: ExpenseCategoryOperationalGroup;

  /** Clasificación P&L: gastos de ventas vs administración. */
  @Column({
    name: 'pnl_nature',
    type: 'enum',
    enum: ExpenseCategoryPnlNature,
    enumName: 'expense_categories_pnl_nature_enum',
    default: ExpenseCategoryPnlNature.ADMIN,
  })
  pnlNature!: ExpenseCategoryPnlNature;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: false })
  requiresApproval!: boolean;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  approvalThreshold!: string;

  @Column({ type: 'uuid', nullable: true })
  defaultResultCenterId?: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /** Categorías de sistema (nómina base): no se pueden eliminar desde admin/API. */
  @Column({ type: 'boolean', default: false })
  nonDeletable!: boolean;

  @Column({ type: 'json', nullable: true })
  examples?: string[] | null;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @ManyToOne(() => ResultCenter, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'defaultResultCenterId' })
  defaultResultCenter?: ResultCenter | null;
}
