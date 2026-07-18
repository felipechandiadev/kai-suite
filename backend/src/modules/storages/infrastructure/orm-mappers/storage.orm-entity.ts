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
import { BranchOrmEntity } from '@modules/branches/infrastructure/orm-mappers/branch.orm-entity';

export enum StorageType {
  WAREHOUSE = 'WAREHOUSE',
  STORE = 'STORE',
  COLD_ROOM = 'COLD_ROOM',
  TRANSIT = 'TRANSIT',
  PRODUCTION_INPUTS = 'PRODUCTION_INPUTS',
}

export enum StorageCategory {
  IN_BRANCH = 'IN_BRANCH',
  CENTRAL = 'CENTRAL',
  EXTERNAL = 'EXTERNAL',
  PRODUCTION_INPUT = 'PRODUCTION_INPUT',
}

@Entity('storages')
export class StorageOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  branchId?: string | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  code?: string;

  @Column({ type: 'varchar', length: 50, default: StorageType.WAREHOUSE })
  type!: StorageType;

  @Column({ type: 'varchar', length: 50, default: StorageCategory.IN_BRANCH })
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

  @Column({ name: 'production_unit_id', type: 'uuid', nullable: true })
  productionUnitId?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @ManyToOne(() => BranchOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branchId' })
  branch?: BranchOrmEntity;
}
