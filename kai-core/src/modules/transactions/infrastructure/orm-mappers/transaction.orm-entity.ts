// Transaction ORM entity mapper (detailed definition below)
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { BranchOrmEntity as Branch } from '@modules/branches/infrastructure/orm-mappers/branch.orm-entity';
import { PointOfSaleOrmEntity as PointOfSale } from '@modules/points-of-sale/infrastructure/orm-mappers/point-of-sale.orm-entity';
import { CashSessionOrmEntity as CashSession } from '@modules/cash-sessions/infrastructure/orm-mappers/cash-session.orm-entity';
import { CustomerOrmEntity as Customer } from '@modules/customers/infrastructure/orm-mappers/customer.orm-entity';
import { SupplierOrmEntity as Supplier } from '@modules/suppliers/infrastructure/orm-mappers/supplier.orm-entity';
import { UserOrmEntity as User } from '@modules/users/infrastructure/orm-mappers/user.orm-entity';
import { ExpenseCategoryOrmEntity as ExpenseCategory } from '@modules/expense-categories/infrastructure/orm-mappers/expense-category.orm-entity';
import { ResultCenterOrmEntity as ResultCenter } from '@modules/result-centers/infrastructure/orm-mappers/result-center.orm-entity';
import { ShareholderOrmEntity as Shareholder } from '@modules/shareholders/infrastructure/orm-mappers/shareholder.orm-entity';
import { AccountingPeriodOrmEntity as AccountingPeriod } from '@modules/accounting-periods/infrastructure/orm-mappers/accounting-period.orm-entity';
import { EmployeeOrmEntity as Employee } from '@modules/employees/infrastructure/orm-mappers/employee.orm-entity';
import { StorageOrmEntity as Storage } from '@modules/storages/infrastructure/orm-mappers/storage.orm-entity';
import { TransactionLineOrmEntity } from '@modules/transaction-lines/infrastructure/orm-mappers/transaction-line.orm-entity';

@Entity('transactions')
@Index(['transactionType', 'createdAt'])
@Index(['branchId', 'createdAt'])
@Index(['documentNumber'])
export class TransactionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  documentNumber!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  transactionType!: string;

  @Column({ type: 'varchar', length: 50, default: 'CONFIRMED' })
  status!: string;

  @Column({ type: 'uuid', nullable: true })
  branchId?: string;

  @Column({ type: 'uuid', nullable: true })
  pointOfSaleId?: string;

  @Column({ type: 'uuid', nullable: true })
  cashSessionId?: string;

  @Column({ type: 'uuid', nullable: true })
  storageId?: string;

  @Column({ type: 'uuid', nullable: true })
  targetStorageId?: string;

  @Column({ type: 'uuid', nullable: true })
  customerId?: string;

  @Column({ type: 'uuid', nullable: true })
  supplierId?: string;

  @Column({ type: 'uuid', nullable: true })
  shareholderId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  employeeId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  expenseCategoryId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  resultCenterId?: string | null;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  taxAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  discountAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total!: number;

  @Column({ type: 'varchar', length: 50, default: 'CASH' })
  paymentMethod!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bankAccountKey?: string;

  @Column({ type: 'uuid', nullable: true })
  cashHubId?: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  documentType?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  documentFolio?: string;

  @Column({ type: 'timestamp', nullable: true })
  paymentDueDate?: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentStatus?: string;

  @Column({ type: 'uuid', nullable: true })
  accountingPeriodId?: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amountPaid!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  changeAmount?: number;

  @Column({ type: 'uuid', nullable: true })
  relatedTransactionId?: string;

  @Column({ type: 'uuid', nullable: true })
  parentTransactionId?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  externalReference?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branchId' })
  branch?: Branch;

  @ManyToOne(() => PointOfSale, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pointOfSaleId' })
  pointOfSale?: PointOfSale;

  @ManyToOne(() => CashSession, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cashSessionId' })
  cashSession?: CashSession;

  @ManyToOne(() => Storage, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'storageId' })
  storageEntry?: Storage;

  @ManyToOne(() => Storage, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'targetStorageId' })
  targetStorageEntry?: Storage;

  @ManyToOne(() => Customer, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customerId' })
  customer?: Customer;

  @ManyToOne(() => Supplier, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplierId' })
  supplier?: Supplier;

  @ManyToOne(() => Shareholder, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'shareholderId' })
  shareholder?: Shareholder | null;

  @ManyToOne(() => Employee, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'employeeId' })
  employee?: Employee | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => ExpenseCategory, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'expenseCategoryId' })
  expenseCategory?: ExpenseCategory | null;

  @ManyToOne(() => ResultCenter, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resultCenterId' })
  resultCenter?: ResultCenter | null;

  @ManyToOne(() => AccountingPeriod, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'accountingPeriodId' })
  accountingPeriod?: AccountingPeriod;

  @ManyToOne(() => TransactionOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'relatedTransactionId' })
  relatedTransaction?: TransactionOrmEntity;

  @ManyToOne(() => TransactionOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentTransactionId' })
  parent?: TransactionOrmEntity;

  @OneToMany(() => TransactionOrmEntity, (t) => t.parent)
  children?: TransactionOrmEntity[];

  @OneToMany(() => TransactionLineOrmEntity, (line) => line.transaction)
  lines?: TransactionLineOrmEntity[];

  @Column({ type: 'timestamp', nullable: true })
  updatedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;
}

(globalThis as any).Transaction = TransactionOrmEntity;
