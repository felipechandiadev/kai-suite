import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  DeliveryDispatchStatus,
  DeliveryOccurrenceKind,
} from './delivery.types';

@Entity('delivery_occurrences')
@Index('idx_delivery_occurrences_company_date', ['companyId', 'occurrenceDate'])
export class EShopDeliveryOccurrence {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  /** LOCAL_DELIVERY = reparto; PICKUP = retiro en local. */
  @Column({ type: 'varchar', length: 32, default: 'LOCAL_DELIVERY' })
  kind!: DeliveryOccurrenceKind;

  @Column({ name: 'occurrence_date', type: 'date' })
  occurrenceDate!: string;

  /** Reparto: hora de salida. Retiro: inicio de ventana. */
  @Column({ name: 'departure_time', type: 'time' })
  departureTime!: string;

  /** Solo PICKUP: fin de ventana de retiro. */
  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime!: string | null;

  @Column({ name: 'order_cutoff_time', type: 'time' })
  orderCutoffTime!: string;

  @Column({ name: 'max_orders', type: 'int', nullable: true })
  maxOrders!: number | null;

  @Column({ name: 'driver_user_id', type: 'uuid', nullable: true })
  driverUserId!: string | null;

  @Column({ name: 'is_cancelled', type: 'boolean', default: false })
  isCancelled!: boolean;

  @Column({ name: 'route_status', type: 'varchar', length: 40, default: 'planned' })
  routeStatus!: DeliveryDispatchStatus;

  @Column({ name: 'total_distance_m', type: 'int', nullable: true })
  totalDistanceM!: number | null;

  @Column({ name: 'total_duration_s', type: 'int', nullable: true })
  totalDurationS!: number | null;

  @Column({ name: 'route_geometry', type: 'jsonb', nullable: true })
  routeGeometry!: Record<string, unknown> | null;

  @Column({ name: 'route_optimized_at', type: 'timestamptz', nullable: true })
  routeOptimizedAt!: Date | null;

  @Column({ name: 'route_started_at', type: 'timestamptz', nullable: true })
  routeStartedAt!: Date | null;

  @Column({ name: 'route_completed_at', type: 'timestamptz', nullable: true })
  routeCompletedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
