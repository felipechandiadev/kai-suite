import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type EShopFulfillmentMethodType =
  | 'PICKUP'
  | 'LOCAL_DELIVERY'
  | 'FLAT_RATE'
  | 'FREE_OVER_THRESHOLD'
  | 'MANUAL_QUOTE';

@Entity('e_shop_fulfillment_methods')
@Index('idx_e_shop_fulfillment_methods_company_id', ['companyId'])
@Index('uq_e_shop_fulfillment_methods_company_code', ['companyId', 'code'], {
  unique: true,
})
export class EShopFulfillmentMethod {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 32 })
  type!: EShopFulfillmentMethodType;

  @Column({ name: 'price_flat', type: 'decimal', precision: 15, scale: 2, nullable: true })
  priceFlat?: number | null;

  @Column({
    name: 'free_shipping_threshold',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  freeShippingThreshold?: number | null;

  @Column({ name: 'estimated_days_min', type: 'int', nullable: true })
  estimatedDaysMin?: number | null;

  @Column({ name: 'estimated_days_max', type: 'int', nullable: true })
  estimatedDaysMax?: number | null;

  @Column({ name: 'requires_address', type: 'boolean', default: false })
  requiresAddress!: boolean;

  @Column({ name: 'requires_phone', type: 'boolean', default: false })
  requiresPhone!: boolean;

  @Column({ type: 'text', nullable: true })
  instructions?: string | null;

  @Column({ name: 'pickup_branch_id', type: 'uuid', nullable: true })
  pickupBranchId?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
