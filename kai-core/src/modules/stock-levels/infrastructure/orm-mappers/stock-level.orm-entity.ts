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
import { ProductVariantOrmEntity } from '@modules/product-variants/infrastructure/orm-mappers/product-variant.orm-entity';
import { StorageOrmEntity } from '@modules/storages/infrastructure/orm-mappers/storage.orm-entity';
import { TransactionOrmEntity } from '@modules/transactions/infrastructure/orm-mappers/transaction.orm-entity';

@Entity('stock_levels')
@Index(['productVariantId', 'storageId'], { unique: true })
export class StockLevelOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  productVariantId!: string;

  @Column({ type: 'uuid' })
  storageId!: string;

  @Column({ type: 'decimal', precision: 15, scale: 3, default: 0 })
  physicalStock!: number;

  @Column({ type: 'decimal', precision: 15, scale: 3, default: 0 })
  committedStock!: number;

  @Column({ type: 'decimal', precision: 15, scale: 3, default: 0 })
  availableStock!: number;

  @Column({ type: 'decimal', precision: 15, scale: 3, default: 0 })
  incomingStock!: number;

  @Column({ name: 'minimum_stock', type: 'int', nullable: true })
  minimumStock?: number | null;

  @Column({ name: 'minimum_stock_enabled', type: 'boolean', nullable: true })
  minimumStockEnabled?: boolean | null;

  @Column({ name: 'maximum_stock', type: 'int', nullable: true })
  maximumStock?: number | null;

  @Column({ name: 'maximum_stock_enabled', type: 'boolean', nullable: true })
  maximumStockEnabled?: boolean | null;

  @Column({ name: 'reorder_point', type: 'int', nullable: true })
  reorderPoint?: number | null;

  @Column({ name: 'reorder_point_enabled', type: 'boolean', nullable: true })
  reorderPointEnabled?: boolean | null;

  @Column({ type: 'uuid', nullable: true })
  lastTransactionId?: string | null;

  @UpdateDateColumn()
  lastUpdated!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => ProductVariantOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productVariantId' })
  variant!: ProductVariantOrmEntity;

  @ManyToOne(() => StorageOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storageId' })
  storage!: StorageOrmEntity;

  @ManyToOne(() => TransactionOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lastTransactionId' })
  lastTransaction?: TransactionOrmEntity | null;
}
