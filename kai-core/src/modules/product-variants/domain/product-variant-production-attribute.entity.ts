import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductVariant } from './product-variant.entity';
import { ProductVariantProductionAttributeOption } from './product-variant-production-attribute-option.entity';

@Entity('product_variant_production_attributes')
@Index('idx_pv_prod_attrs_company_variant', ['companyId', 'productVariantId'])
export class ProductVariantProductionAttribute {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'product_variant_id', type: 'uuid' })
  productVariantId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  /** Slug estable para agrupar (reportes / UI). */
  @Column({ name: 'tag_key', type: 'varchar', length: 64, nullable: true })
  tagKey?: string | null;

  @Column({ name: 'tag_label', type: 'varchar', length: 80, nullable: true })
  tagLabel?: string | null;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date | null;

  @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_variant_id' })
  productVariant?: ProductVariant;

  @OneToMany(
    () => ProductVariantProductionAttributeOption,
    (o) => o.attribute,
  )
  options?: ProductVariantProductionAttributeOption[];
}
