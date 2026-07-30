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
import { BranchOrmEntity } from '@modules/branches/infrastructure/orm-mappers/branch.orm-entity';
import { ResultCenterOrmEntity } from '@modules/result-centers/infrastructure/orm-mappers/result-center.orm-entity';
import { ExpenseCategoryOrmEntity } from '@modules/expense-categories/infrastructure/orm-mappers/expense-category.orm-entity';
import { SupplierOrmEntity } from '@modules/suppliers/infrastructure/orm-mappers/supplier.orm-entity';
import { EmployeeOrmEntity } from '@modules/employees/infrastructure/orm-mappers/employee.orm-entity';
import { UserOrmEntity } from '@modules/users/infrastructure/orm-mappers/user.orm-entity';

export enum OperationalExpenseStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export interface OperationalExpenseMetadata {
  estimatedAmount?: number;
  invoiceNumber?: string;
  notes?: string;
}

@Entity('operational_expenses')
export class OperationalExpenseOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid', nullable: true })
  branchId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  resultCenterId?: string | null;

  @Column({ type: 'uuid' })
  categoryId!: string;

  @Column({ type: 'uuid', nullable: true })
  supplierId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  employeeId?: string | null;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  referenceNumber?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'date' })
  operationDate!: string;

  @Column({
    type: 'varchar',
    length: 32,
    default: OperationalExpenseStatus.DRAFT,
  })
  status!: OperationalExpenseStatus;

  @Column({ type: 'json', nullable: true })
  metadata?: OperationalExpenseMetadata | null;

  @Column({ type: 'uuid' })
  createdBy!: string;

  @Column({ type: 'uuid', nullable: true })
  approvedBy?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => CompanyOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: CompanyOrmEntity;

  @ManyToOne(() => BranchOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branchId' })
  branch?: BranchOrmEntity | null;

  @ManyToOne(() => ResultCenterOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resultCenterId' })
  resultCenter?: ResultCenterOrmEntity | null;

  @ManyToOne(() => ExpenseCategoryOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoryId' })
  category!: ExpenseCategoryOrmEntity;

  @ManyToOne(() => SupplierOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplierId' })
  supplier?: SupplierOrmEntity | null;

  @ManyToOne(() => EmployeeOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'employeeId' })
  employee?: EmployeeOrmEntity | null;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'createdBy' })
  createdByUser!: UserOrmEntity;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approvedBy' })
  approvedByUser?: UserOrmEntity | null;
}
