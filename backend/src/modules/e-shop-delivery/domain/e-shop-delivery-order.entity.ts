import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { DeliveryOrderStatus } from './delivery.types';

@Entity('e_shop_delivery_orders')
@Index('idx_e_shop_delivery_orders_company_status', ['companyId', 'deliveryStatus'])
@Index('uq_e_shop_delivery_orders_transaction', ['transactionId'], { unique: true })
export class EShopDeliveryOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId!: string;

  @Column({ name: 'fulfillment_type', type: 'varchar', length: 32, default: 'LOCAL_DELIVERY' })
  fulfillmentType!: 'PICKUP' | 'LOCAL_DELIVERY';

  @Column({ name: 'delivery_zone_id', type: 'uuid', nullable: true })
  deliveryZoneId!: string | null;

  @Column({ name: 'delivery_occurrence_id', type: 'uuid', nullable: true })
  deliveryOccurrenceId!: string | null;

  @Column({ name: 'delivery_dispatch_id', type: 'uuid', nullable: true })
  deliveryDispatchId!: string | null;

  @Column({ name: 'delivery_status', type: 'varchar', length: 40, default: 'SUBMITTED' })
  deliveryStatus!: DeliveryOrderStatus;

  @Column({ name: 'address_line1', type: 'varchar', length: 255, nullable: true })
  addressLine1!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  commune!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  region!: string | null;

  @Column({ type: 'double precision', nullable: true })
  latitude!: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude!: number | null;

  @Column({ name: 'shipping_fee', type: 'numeric', precision: 15, scale: 2, default: 0 })
  shippingFee!: number;

  @Column({ name: 'customer_name', type: 'varchar', length: 255, nullable: true })
  customerName!: string | null;

  @Column({ name: 'customer_phone', type: 'varchar', length: 64, nullable: true })
  customerPhone!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
