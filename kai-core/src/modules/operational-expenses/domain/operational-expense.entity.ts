import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from '@modules/companies/domain/company.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { ResultCenter } from '@modules/result-centers/domain/result-center.entity';
import { ExpenseCategory } from '@modules/expense-categories/domain/expense-category.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { Employee } from '@modules/employees/domain/employee.entity';
import { User } from '@modules/users/domain/user.entity';
import { PaymentStatus } from '@modules/transactions/domain/transaction.entity';

export enum OperationalExpenseDocumentKind {
  SUPPLIER_INVOICE = 'SUPPLIER_INVOICE',
  SUPPLIER_RECEIPT = 'SUPPLIER_RECEIPT',
  SUPPLIER_HONORARIUM_RECEIPT = 'SUPPLIER_HONORARIUM_RECEIPT',
  OTHER = 'OTHER',
}

export interface OperationalExpenseMediaAsset {
  id: string;
  publicUrl: string;
  mimeType: string;
  kind: string;
}

export enum OperationalExpenseStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

/** Plan de pagos asociado al DTE vinculado (misma forma que factura proveedor). */
export type OperationalExpenseLinkedPlannedPayment = {
  dueDate: string;
  amount: number;
  /** Medio de pago; omitir en cuotas programadas (se define al ejecutar el pago). */
  paymentMethod?: 'CASH' | 'TRANSFER' | 'CHECK';
  companyBankAccountKey?: string | null;
  supplierBankAccountKey?: string | null;
  /** Número del cheque (cuando `paymentMethod === 'CHECK'`). */
  chequeNumber?: string | null;
  /** Banco emisor del cheque (la propia empresa). */
  chequeBankName?: string | null;
  /** Nombre del girador (responsable que firma). */
  chequeDrawerName?: string | null;
  /** "A fecha" para cheques postdatados. */
  chequeDueDate?: string | null;
};

export type OperationalExpenseLinkedDteKind =
  | 'SUPPLIER_INVOICE'
  | 'SUPPLIER_RECEIPT'
  | 'SUPPLIER_HONORARIUM_RECEIPT';

export interface OperationalExpenseLinkedTributaryDocument {
  kind: OperationalExpenseLinkedDteKind;
  dteNumber?: string;
  netAmount: number;
  totalAmount: number;
  taxAmount: number;
  taxId?: string | null;
  plannedPayments: OperationalExpenseLinkedPlannedPayment[];
}

export interface OperationalExpenseMetadata {
  estimatedAmount?: number;
  invoiceNumber?: string;
  notes?: string;
  linkedTributaryDocument?: OperationalExpenseLinkedTributaryDocument | null;
  operatingExpenseTransactionId?: string;
}

@Entity('operational_expenses')
export class OperationalExpense {
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
    type: 'enum',
    enum: OperationalExpenseStatus,
    default: OperationalExpenseStatus.DRAFT,
  })
  status!: OperationalExpenseStatus;

  @Column({
    type: 'enum',
    enum: OperationalExpenseDocumentKind,
    nullable: true,
  })
  documentKind?: OperationalExpenseDocumentKind | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  paymentStatus?: PaymentStatus | null;

  @Column({ type: 'uuid', nullable: true })
  supplierFiscalDocumentTransactionId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  operatingExpenseTransactionId?: string | null;

  @Column({ type: 'json', nullable: true })
  metadata?: OperationalExpenseMetadata | null;

  mediaAssets?: OperationalExpenseMediaAsset[];

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

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @ManyToOne(() => Branch, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branchId' })
  branch?: Branch | null;

  @ManyToOne(() => ResultCenter, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resultCenterId' })
  resultCenter?: ResultCenter | null;

  @ManyToOne(() => ExpenseCategory, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoryId' })
  category!: ExpenseCategory;

  @ManyToOne(() => Supplier, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplierId' })
  supplier?: Supplier | null;

  @ManyToOne(() => Employee, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'employeeId' })
  employee?: Employee | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'createdBy' })
  createdByUser!: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approvedBy' })
  approvedByUser?: User | null;
}
