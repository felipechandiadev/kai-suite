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
import { Branch } from '@modules/branches/domain/branch.entity';
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';

export enum StorageType {
  WAREHOUSE = 'WAREHOUSE',
  STORE = 'STORE',
  COLD_ROOM = 'COLD_ROOM',
  TRANSIT = 'TRANSIT',
  /** Bodega dedicada a insumos de una unidad de producción. */
  PRODUCTION_INPUTS = 'PRODUCTION_INPUTS',
}

export enum StorageCategory {
  IN_BRANCH = 'IN_BRANCH',
  CENTRAL = 'CENTRAL',
  EXTERNAL = 'EXTERNAL',
  /** Bodega de insumos dedicada a una unidad de producción autónoma. */
  PRODUCTION_INPUT = 'PRODUCTION_INPUT',
}

@Entity('storages')
export class Storage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_storages_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid', nullable: true })
  branchId?: string | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  code?: string;

  @Column({ type: 'enum', enum: StorageType, default: StorageType.WAREHOUSE })
  type!: StorageType;

  @Column({
    type: 'enum',
    enum: StorageCategory,
    default: StorageCategory.IN_BRANCH,
  })
  category!: StorageCategory;

  @Column({ type: 'int', nullable: true })
  capacity?: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address?: string;

  @Column({ type: 'json', nullable: true })
  location?: { lat: number; lng: number };

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /** Dueño exclusivo cuando category = PRODUCTION_INPUT (unidad autónoma). */
  @Column({ name: 'production_unit_id', type: 'uuid', nullable: true })
  productionUnitId?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Relations
  @ManyToOne(() => Branch, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branchId' })
  branch?: Branch;

  @ManyToOne(() => ProductionUnit, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'production_unit_id' })
  productionUnit?: ProductionUnit | null;
}
