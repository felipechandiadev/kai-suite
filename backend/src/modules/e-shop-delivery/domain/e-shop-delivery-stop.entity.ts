import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { DeliveryStopStatus } from './delivery.types';

@Entity('e_shop_delivery_stops')
@Index('idx_e_shop_delivery_stops_dispatch_sequence', ['dispatchId', 'sequence'])
export class EShopDeliveryStop {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'dispatch_id', type: 'uuid' })
  dispatchId!: string;

  @Column({ name: 'delivery_order_id', type: 'uuid' })
  deliveryOrderId!: string;

  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId!: string;

  @Column({ type: 'int' })
  sequence!: number;

  @Column({ type: 'double precision' })
  latitude!: number;

  @Column({ type: 'double precision' })
  longitude!: number;

  @Column({ name: 'eta_at', type: 'timestamptz', nullable: true })
  etaAt!: Date | null;

  @Column({ name: 'stop_status', type: 'varchar', length: 32, default: 'pending' })
  stopStatus!: DeliveryStopStatus;

  @Column({ name: 'visited_at', type: 'timestamptz', nullable: true })
  visitedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  issueNote!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
