// ProductVariant ORM entity mapper (detailed definition below)
import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ProductOrmEntity as Product } from '@modules/products/infrastructure/orm-mappers/product.orm-entity';
import { UnitOrmEntity as Unit } from '@modules/units/infrastructure/orm-mappers/unit.orm-entity';
import { PriceListItemOrmEntity as PriceListItem } from '@modules/price-list-items/infrastructure/orm-mappers/price-list-item.orm-entity';
import type { PmpHistoryEntry } from '@modules/product-variants/domain/pmp-history.types';
import type { SalePriceHistoryEntry } from '@modules/product-variants/domain/sale-price-history.types';

@Entity('product_variants')
export class ProductVariantOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  sku!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  barcode?: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  basePrice!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  baseCost!: number;

  @Column({
    name: 'labor_cost_override',
    type: 'decimal',
    precision: 15,
    scale: 6,
    nullable: true,
  })
  laborCostOverride?: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  pmp!: number | null;

  @Column({ type: 'json', nullable: true })
  pmpHistory?: PmpHistoryEntry[] | null;

  @Column({ type: 'json', nullable: true })
  salePriceHistory?: SalePriceHistoryEntry[] | null;

  @Column({ type: 'uuid', name: 'unit_id' })
  unitId!: string;

  @ManyToOne(() => Unit, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'unit_id' })
  unit!: Unit;

  @Column({ type: 'uuid', name: 'stock_base_unit_id' })
  stockBaseUnitId!: string;

  @ManyToOne(() => Unit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'stock_base_unit_id' })
  stockBaseUnit!: Unit;

  @Column({ type: 'uuid', name: 'sale_unit_id' })
  saleUnitId!: string;

  @ManyToOne(() => Unit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sale_unit_id' })
  saleUnit!: Unit;

  @Column({ type: 'uuid', name: 'purchase_unit_id' })
  purchaseUnitId!: string;

  @ManyToOne(() => Unit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'purchase_unit_id' })
  purchaseUnit!: Unit;

  @Column({
    name: 'stock_base_qty_per_count_sale_unit',
    type: 'decimal',
    precision: 18,
    scale: 9,
    nullable: true,
  })
  stockBaseQtyPerCountSaleUnit?: number | string | null;

  @Column({
    name: 'stock_base_qty_per_count_purchase_unit',
    type: 'decimal',
    precision: 18,
    scale: 9,
    nullable: true,
  })
  stockBaseQtyPerCountPurchaseUnit?: number | string | null;

  @Column({
    name: 'net_weight_kg',
    type: 'decimal',
    precision: 14,
    scale: 6,
    nullable: true,
  })
  netWeightKg?: number | string | null;

  @Column({
    name: 'gross_weight_kg',
    type: 'decimal',
    precision: 14,
    scale: 6,
    nullable: true,
  })
  grossWeightKg?: number | string | null;

  @Column({
    name: 'package_length_cm',
    type: 'decimal',
    precision: 12,
    scale: 3,
    nullable: true,
  })
  packageLengthCm?: number | string | null;

  @Column({
    name: 'package_width_cm',
    type: 'decimal',
    precision: 12,
    scale: 3,
    nullable: true,
  })
  packageWidthCm?: number | string | null;

  @Column({
    name: 'package_height_cm',
    type: 'decimal',
    precision: 12,
    scale: 3,
    nullable: true,
  })
  packageHeightCm?: number | string | null;

  @Column({ name: 'volumetric_divisor_k', type: 'int', nullable: true })
  volumetricDivisorK?: number | null;

  @Column({ type: 'json', nullable: true })
  attributeValues?: Record<string, string>;

  @Column({ type: 'json', nullable: true })
  taxIds?: string[];

  @Column({ name: 'tax_category', type: 'varchar', length: 40, default: 'TAX_STANDARD' })
  taxCategory!: string;

  @Column({ name: 'requires_dte', type: 'boolean', default: true })
  requiresDte!: boolean;

  @Column({ type: 'boolean', default: true })
  trackInventory!: boolean;

  @Column({ type: 'boolean', default: false })
  allowNegativeStock!: boolean;

  @Column({ type: 'int', default: 0 })
  minimumStock!: number;

  @Column({ name: 'minimum_stock_enabled', type: 'boolean', default: false })
  minimumStockEnabled!: boolean;

  @Column({ type: 'int', default: 0 })
  maximumStock!: number;

  @Column({ name: 'maximum_stock_enabled', type: 'boolean', default: false })
  maximumStockEnabled!: boolean;

  @Column({ type: 'int', default: 0 })
  reorderPoint!: number;

  @Column({ name: 'reorder_point_enabled', type: 'boolean', default: false })
  reorderPointEnabled!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @ManyToOne(() => Product, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  product?: Product;

  @OneToMany(
    () => PriceListItem,
    (priceListItem) => priceListItem.productVariant,
  )
  priceListItems?: PriceListItem[];
}
