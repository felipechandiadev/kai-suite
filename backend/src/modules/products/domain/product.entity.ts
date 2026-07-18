import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Category } from '@modules/categories/domain/category.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { ResultCenter } from '@modules/result-centers/domain/result-center.entity';
import { Brand } from '@modules/brands/domain/brand.entity';

export type ProductChangeHistoryTargetType = 'PRODUCT' | 'VARIANT';
export type ProductChangeHistoryAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface ProductChangeHistoryChange {
  field: string;
  previousValue?: unknown;
  newValue?: unknown;
}

export interface ProductChangeHistoryEntry {
  id: string;
  timestamp: string;
  targetType: ProductChangeHistoryTargetType;
  targetId: string;
  targetLabel?: string;
  action: ProductChangeHistoryAction;
  summary: string;
  userId?: string;
  userName?: string;
  changes?: ProductChangeHistoryChange[];
  metadata?: Record<string, unknown>;
}

export interface ProductMediaAsset {
  isPrimary?: boolean;
  id: string;
  publicUrl: string;
  mimeType: string;
  kind: string;
}

export enum ProductType {
  PHYSICAL = 'PHYSICAL',
  SERVICE = 'SERVICE',
  DIGITAL = 'DIGITAL',
  MANUFACTURADO = 'MANUFACTURADO',
  ELABORADO = 'ELABORADO',
  PREPARADO = 'PREPARADO',
  /** Materia prima / suministro: compra + inventario; no venta ni eShop. */
  INSUMO = 'INSUMO',
}

/**
 * Product representa los datos maestros/padre del catálogo.
 * SKU, precios e inventario viven en ProductVariant.
 * Todo producto se gestiona exclusivamente a través de variantes.
 */
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_products_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid', nullable: true })
  categoryId?: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand?: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'brand_id' })
  brandId?: string | null;

  @ManyToOne(() => Brand, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'brand_id' })
  catalogBrand?: Brand | null;

  @Column({ type: 'enum', enum: ProductType, default: ProductType.PHYSICAL })
  productType!: ProductType;

  /**
   * Array de IDs de impuestos aplicables por defecto a las variantes
   * Las variantes pueden sobreescribir esto con su propio taxIds
   */
  @Column({ type: 'json', nullable: true })
  taxIds?: string[];

  primaryImageUrl?: string | null;

  mediaAssets?: ProductMediaAsset[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'visible_in_e_shop', type: 'boolean', default: false })
  visibleInEShop!: boolean;

  @Column({ type: 'uuid', nullable: true })
  resultCenterId?: string | null;

  @ManyToOne(() => ResultCenter, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'resultCenterId' })
  resultCenter?: ResultCenter;

  @Column({ type: 'uuid', nullable: true, name: 'base_unit_id' })
  baseUnitId?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  changeHistory?: ProductChangeHistoryEntry[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Relations
  @ManyToOne(() => Category, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category?: Category;

  @ManyToOne(() => Unit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'base_unit_id' })
  baseUnit?: Unit;

  // Note: ProductVariant has ManyToOne to Product
  // We don't define inverse OneToMany here to avoid circular metadata issues

  constructor(data?: Partial<Product>) {
    if (data) Object.assign(this, data);
  }
}
