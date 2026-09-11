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
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { DiningOrderLine } from './dining-order-line.entity';

@Entity('dining_order_line_addons')
@Index('idx_dining_order_line_addons_line_id', ['diningOrderLineId'])
export class DiningOrderLineAddon {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'dining_order_line_id', type: 'uuid' })
  diningOrderLineId!: string;

  @Column({ name: 'addon_variant_id', type: 'uuid' })
  addonVariantId!: string;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 1 })
  quantity!: number;

  @Column({ name: 'display_name', type: 'varchar', length: 255 })
  displayName!: string;

  @Column({
    name: 'unit_price_snapshot',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  unitPriceSnapshot!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => DiningOrderLine, (line) => line.addons, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dining_order_line_id' })
  diningOrderLine?: DiningOrderLine;

  @ManyToOne(() => ProductVariant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'addon_variant_id' })
  addonVariant?: ProductVariant;
}
