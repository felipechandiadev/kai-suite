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
} from 'typeorm';
import { CategoryOrmEntity as Category } from '@modules/categories/infrastructure/orm-mappers/category.orm-entity';
import { UnitOrmEntity as Unit } from '@modules/units/infrastructure/orm-mappers/unit.orm-entity';
import { ResultCenterOrmEntity as ResultCenter } from '@modules/result-centers/infrastructure/orm-mappers/result-center.orm-entity';

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

export enum ProductType {
  PHYSICAL = 'PHYSICAL',
  SERVICE = 'SERVICE',
  DIGITAL = 'DIGITAL',
  MANUFACTURADO = 'MANUFACTURADO',
  ELABORADO = 'ELABORADO',
  PREPARADO = 'PREPARADO',
  INSUMO = 'INSUMO',
}

@Entity('products')
export class ProductOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  categoryId?: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand?: string;

  @Column({ type: 'uuid', nullable: true, name: 'brand_id' })
  brandId?: string | null;

  @Column({ type: 'varchar', length: 50, default: ProductType.PHYSICAL })
  productType!: ProductType;

  @Column({ type: 'json', nullable: true })
  taxIds?: string[];

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

  @ManyToOne(() => Category, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category?: Category;

  @ManyToOne(() => Unit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'base_unit_id' })
  baseUnit?: Unit;
}
