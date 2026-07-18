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
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';
import { ProductVariant } from './product-variant.entity';

@Entity('product_variant_production_units')
@Index('idx_pv_prod_units_company_variant', ['companyId', 'productVariantId'])
@Index(
  'uq_pv_prod_units_variant_branch_unit',
  ['productVariantId', 'branchId', 'productionUnitId'],
  { unique: true },
)
@Index('uq_pv_prod_units_variant_branch_default', ['productVariantId', 'branchId'], {
  unique: true,
  where: 'is_default = true',
})
export class ProductVariantProductionUnit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'product_variant_id', type: 'uuid' })
  productVariantId!: string;

  /** Sucursal desde la que se pide / vende. */
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @Column({ name: 'production_unit_id', type: 'uuid' })
  productionUnitId!: string;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_variant_id' })
  productVariant?: ProductVariant;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @ManyToOne(() => ProductionUnit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'production_unit_id' })
  productionUnit?: ProductionUnit;
}
