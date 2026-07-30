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
import { CompanyOrmEntity } from '@modules/companies/infrastructure/orm-mappers/company.orm-entity';
import { ResultCenterOrmEntity } from '@modules/result-centers/infrastructure/orm-mappers/result-center.orm-entity';
import { ExpenseCategoryOperationalGroup } from '@modules/expense-categories/domain/expense-category-operational-group.enum';
import { ExpenseCategoryPnlNature } from '@modules/expense-categories/domain/expense-category-pnl-nature.enum';

@Entity('expense_categories')
export class ExpenseCategoryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

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

  @ManyToOne(() => CompanyOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: CompanyOrmEntity;

  @ManyToOne(() => ResultCenterOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'defaultResultCenterId' })
  defaultResultCenter?: ResultCenterOrmEntity | null;
}
