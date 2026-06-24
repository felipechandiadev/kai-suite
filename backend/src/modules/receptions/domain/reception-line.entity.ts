import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Reception } from './reception.entity';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';

/**
 * ReceptionLine - Línea de detalle de recepción
 *
 * Almacena la información de cada producto/variante recibido.
 * Incluye cantidades, precios y costos unitarios.
 */
@Entity('reception_lines')
@Index(['receptionId'])
@Index(['productVariantId'])
@Index('idx_reception_lines_company_id', ['companyId'])
export class ReceptionLine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  receptionId!: string;

  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @Column({ type: 'uuid', nullable: true })
  productVariantId?: string;

  // Snapshot del producto al momento de la recepción
  @Column({ type: 'varchar', length: 255 })
  productName!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sku?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  variantName?: string;

  // Cantidades
  @Column({ type: 'decimal', precision: 15, scale: 4 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, nullable: true })
  receivedQuantity?: number;

  // Precios y costos
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  unitPrice!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  unitCost?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ type: 'int', default: 1 })
  lineNumber!: number;

  /** Stock físico en el almacén de la recepción antes del ingreso (unidad de inventario). */
  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true })
  storagePhysicalBefore?: number | null;

  /** Stock físico en el almacén de la recepción después del ingreso (unidad de inventario). */
  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true })
  storagePhysicalAfter?: number | null;

  // Relaciones
  @ManyToOne(() => Reception, (reception) => reception.lines)
  @JoinColumn({ name: 'receptionId' })
  reception!: Reception;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'productId' })
  product?: Product;

  @ManyToOne(() => ProductVariant, { nullable: true })
  @JoinColumn({ name: 'productVariantId' })
  productVariant?: ProductVariant;
}
