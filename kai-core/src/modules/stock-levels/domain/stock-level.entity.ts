import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';

/**
 * SALDOS DE INVENTARIO (CONSOLIDADO)
 *
 * Esta entidad guarda el saldo actual (stock) de una variante en una bodega específica.
 * Se actualiza incrementalmente con cada transacción para evitar recalcular
 * todo el historial, garantizando performance instantánea.
 */
@Entity('stock_levels')
@Index(['productVariantId', 'storageId'], { unique: true })
export class StockLevel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_stock_levels_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  productVariantId!: string;

  @Column({ type: 'uuid' })
  storageId!: string;

  // Cantidad actual FISICA en unidad BASE
  @Column({ type: 'decimal', precision: 15, scale: 3, default: 0 })
  physicalStock!: number;

  // Cantidad RESERVADA para órdenes confirmadas pendientes de entrega
  @Column({ type: 'decimal', precision: 15, scale: 3, default: 0 })
  committedStock!: number;

  // Cantidad DISPONIBLE para venta (fisica - reservada)
  @Column({ type: 'decimal', precision: 15, scale: 3, default: 0 })
  availableStock!: number;

  // Cantidad EN CAMINO (compras confirmadas no recibidas)
  @Column({ type: 'decimal', precision: 15, scale: 3, default: 0 })
  incomingStock!: number;

  /** Si es null, se hereda `ProductVariant.minimumStock`. */
  @Column({ name: 'minimum_stock', type: 'int', nullable: true })
  minimumStock?: number | null;

  /** null = hereda habilitación de variante; false = desactivado en este almacén. */
  @Column({ name: 'minimum_stock_enabled', type: 'boolean', nullable: true })
  minimumStockEnabled?: boolean | null;

  /** Si es null, se hereda `ProductVariant.maximumStock`. */
  @Column({ name: 'maximum_stock', type: 'int', nullable: true })
  maximumStock?: number | null;

  @Column({ name: 'maximum_stock_enabled', type: 'boolean', nullable: true })
  maximumStockEnabled?: boolean | null;

  /** Si es null, se hereda `ProductVariant.reorderPoint`. */
  @Column({ name: 'reorder_point', type: 'int', nullable: true })
  reorderPoint?: number | null;

  @Column({ name: 'reorder_point_enabled', type: 'boolean', nullable: true })
  reorderPointEnabled?: boolean | null;

  // Referencia a la última transacción que afectó este saldo
  @Column({ type: 'uuid', nullable: true })
  lastTransactionId?: string | null;

  @UpdateDateColumn()
  lastUpdated!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relaciones
  @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productVariantId' })
  variant!: ProductVariant;

  @ManyToOne(() => Storage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storageId' })
  storage!: Storage;

  @ManyToOne(() => Transaction, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lastTransactionId' })
  lastTransaction?: Transaction | null;
}
