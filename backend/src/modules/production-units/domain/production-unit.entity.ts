import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import {
  ProductionUnitInventoryMode,
  ProductionUnitPurpose,
  ProductionUnitScope,
} from './production-unit.enums';

@Entity('production_units')
@Index('idx_production_units_company_id', ['companyId'])
@Index('uq_production_units_branch_code', ['companyId', 'branchId', 'code'], {
  unique: true,
  where: `"scope" = 'BRANCH'`,
})
@Index('uq_production_units_company_code', ['companyId', 'code'], {
  unique: true,
  where: `"scope" = 'COMPANY'`,
})
export class ProductionUnit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  /** Null when scope = COMPANY (fábrica / planta central). */
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId?: string | null;

  @Column({ type: 'varchar', length: 16, default: ProductionUnitScope.BRANCH })
  scope!: ProductionUnitScope;

  @Column({
    name: 'inventory_mode',
    type: 'varchar',
    length: 16,
    default: ProductionUnitInventoryMode.DEPENDENT,
  })
  inventoryMode!: ProductionUnitInventoryMode;

  /** Cocina (KDS / PREPARADO) vs lotes (órdenes de producción). */
  @Column({
    type: 'varchar',
    length: 16,
    default: ProductionUnitPurpose.KITCHEN,
  })
  purpose!: ProductionUnitPurpose;

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'default_input_storage_id', type: 'uuid', nullable: true })
  defaultInputStorageId?: string | null;

  @Column({ name: 'default_output_storage_id', type: 'uuid', nullable: true })
  defaultOutputStorageId?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch | null;

  @ManyToOne(() => Storage, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'default_input_storage_id' })
  defaultInputStorage?: Storage | null;

  @ManyToOne(() => Storage, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'default_output_storage_id' })
  defaultOutputStorage?: Storage | null;
}
