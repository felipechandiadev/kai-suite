import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductVariantProductionAttribute } from './product-variant-production-attribute.entity';

@Entity('product_variant_production_attribute_options')
@Index('idx_pv_prod_attr_opts_attribute', ['attributeId'])
export class ProductVariantProductionAttributeOption {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'attribute_id', type: 'uuid' })
  attributeId!: string;

  @Column({ type: 'varchar', length: 120 })
  label!: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date | null;

  @ManyToOne(() => ProductVariantProductionAttribute, (a) => a.options, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'attribute_id' })
  attribute?: ProductVariantProductionAttribute;
}
