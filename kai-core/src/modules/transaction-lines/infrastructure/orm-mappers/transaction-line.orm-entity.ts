import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TransactionOrmEntity } from '@modules/transactions/infrastructure/orm-mappers/transaction.orm-entity';
import { ProductOrmEntity } from '@modules/products/infrastructure/orm-mappers/product.orm-entity';
import { ProductVariantOrmEntity } from '@modules/product-variants/infrastructure/orm-mappers/product-variant.orm-entity';
import { TaxOrmEntity } from '@modules/taxes/infrastructure/orm-mappers/tax.orm-entity';
import { UnitOrmEntity } from '@modules/units/infrastructure/orm-mappers/unit.orm-entity';

@Entity('transaction_lines')
export class TransactionLineOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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

  @Column({ type: 'int', default: 1 })
  lineNumber!: number;

  @Column({ type: 'varchar', length: 255 })
  productName!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  productSku?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  variantName?: string;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true })
  quantityInBase?: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  unitOfMeasure?: string;

  @Column({ type: 'decimal', precision: 18, scale: 9, nullable: true })
  unitConversionFactor?: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  unitPrice!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  unitCost?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercentage!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  discountAmount!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxRate!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  taxAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => TransactionOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'transactionId' })
  transaction?: TransactionOrmEntity;

  @ManyToOne(() => ProductOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'productId' })
  product?: ProductOrmEntity;

  @ManyToOne(() => ProductVariantOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productVariantId' })
  productVariant?: ProductVariantOrmEntity;

  @ManyToOne(() => UnitOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'unitId' })
  unit?: UnitOrmEntity;

  @ManyToOne(() => TaxOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'taxId' })
  tax?: TaxOrmEntity;
}
