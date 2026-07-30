import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Tax } from '@modules/taxes/domain/tax.entity';
import { Unit } from '@modules/units/domain/unit.entity';

/**
 * TransactionLine - Línea de detalle de transacción
 *
 * Cada línea es inmutable como su transacción padre.
 * Almacena una instantánea del producto al momento de la transacción
 * para preservar el registro histórico incluso si el producto cambia.
 */
@Entity('transaction_lines')
export class TransactionLine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_transaction_lines_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid', nullable: true })
  transactionId?: string;

  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @Column({ type: 'uuid', nullable: true })
  productVariantId?: string;

  @Column({ type: 'uuid', nullable: true })
  unitId?: string;

  @Column({ type: 'uuid', nullable: true })
  taxId?: string;

  // Número de línea para ordenamiento
  @Column({ type: 'int', default: 1 })
  lineNumber!: number;

  // Snapshot del producto al momento de la transacción
  @Column({ type: 'varchar', length: 255 })
  productName!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  productSku?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  variantName?: string;

  // Cantidades
  @Column({ type: 'decimal', precision: 15, scale: 4 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true })
  quantityInBase?: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  unitOfMeasure?: string;

  @Column({ type: 'decimal', precision: 18, scale: 9, nullable: true })
  unitConversionFactor?: number | null;

  // Precios
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  unitPrice!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  unitCost?: number;

  // Descuentos
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercentage!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  discountAmount!: number;

  // Impuestos
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxRate!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  taxAmount!: number;

  // Totales
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total!: number;

  // Notas por línea
  @Column({ type: 'text', nullable: true })
  notes?: string;

  // INMUTABLE: Solo fecha de creación
  @CreateDateColumn()
  createdAt!: Date;

  // Relations
  @ManyToOne(() => Transaction, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'transactionId' })
  transaction?: Transaction;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'productId' })
  product?: Product;

  @ManyToOne(() => ProductVariant, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productVariantId' })
  productVariant?: ProductVariant;

  @ManyToOne(() => Unit, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'unitId' })
  unit?: Unit;

  @ManyToOne(() => Tax, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'taxId' })
  tax?: Tax;
}

// Expose class on globalThis so relation thunks that resolve at runtime (in bundled builds)
// can find the constructor without relying on string names or require() resolution.
(globalThis as any).TransactionLine = TransactionLine;
