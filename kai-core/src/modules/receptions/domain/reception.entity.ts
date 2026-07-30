import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Storage } from '@modules/storages/domain/storage.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { User } from '@modules/users/domain/user.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';

/**
 * Reception - Recepción de mercancía
 *
 * Representa la recepción física de productos en bodega.
 * Puede originarse de:
 * - Compra directa (type: 'direct')
 * - Orden de compra (type: 'from-purchase-order')
 *
 * Cada recepción genera una transacción PURCHASE que activa:
 * - Actualización de inventario
 * - Creación de cuentas por pagar (installments)
 * - Asientos contables
 */
@Entity('receptions')
@Index(['storageId'])
@Index(['supplierId'])
@Index(['branchId'])
@Index(['createdAt'])
@Index('idx_receptions_company_id', ['companyId'])
export class Reception {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 50, default: 'direct' })
  type!: string; // 'direct' | 'from-purchase-order'

  @Column({ type: 'uuid', nullable: true })
  storageId?: string;

  @Column({ type: 'uuid', nullable: true })
  branchId?: string;

  @Column({ type: 'uuid', nullable: true })
  supplierId?: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  // Referencia externa (número de documento del proveedor, etc.)
  @Column({ type: 'varchar', length: 255, nullable: true })
  reference?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  documentNumber?: string;

  /** Número/folio del DTE (factura, boleta o guía) asociado al ingreso. */
  @Column({ type: 'varchar', length: 128, nullable: true })
  dteNumber?: string;

  /** `invoice` | `receipt` | `guide` | `other` — alineado con `document_type` en metadata de transacción de ingreso. */
  @Column({ type: 'varchar', length: 32, nullable: true })
  dteType?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // Totales calculados
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  taxAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  discountAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total!: number;

  @Column({ type: 'int', default: 0 })
  lineCount!: number;

  // ID de la transacción PURCHASE generada
  @Column({ type: 'uuid', nullable: true })
  transactionId?: string;

  // Plan de pagos (cuotas) - almacenado como JSON
  // Cada item: { installmentNumber, amount, dueDate }
  @Column({ type: 'json', nullable: true })
  payments?: any;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relaciones
  @ManyToOne(() => Storage, { nullable: true })
  @JoinColumn({ name: 'storageId' })
  storage?: Storage;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branchId' })
  branch?: Branch;

  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplierId' })
  supplier?: Supplier;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => Transaction, { nullable: true })
  @JoinColumn({ name: 'transactionId' })
  transaction?: Transaction;

  @OneToMany('ReceptionLine', 'reception')
  lines?: any[];
}
