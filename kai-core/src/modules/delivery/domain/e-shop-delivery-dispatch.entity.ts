import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { DeliveryDispatchStatus } from './delivery.types';

@Entity('delivery_dispatches')
@Index('idx_delivery_dispatches_company_occurrence', ['companyId', 'occurrenceId'])
export class EShopDeliveryDispatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'occurrence_id', type: 'uuid' })
  occurrenceId!: string;

  @Column({ name: 'driver_user_id', type: 'uuid', nullable: true })
  driverUserId!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  label!: string | null;

  @Column({ type: 'varchar', length: 40, default: 'planned' })
  status!: DeliveryDispatchStatus;

  @Column({ name: 'total_distance_m', type: 'int', nullable: true })
  totalDistanceM!: number | null;

  @Column({ name: 'total_duration_s', type: 'int', nullable: true })
  totalDurationS!: number | null;

  @Column({ name: 'route_geometry', type: 'jsonb', nullable: true })
  routeGeometry!: Record<string, unknown> | null;

  @Column({ name: 'route_optimized_at', type: 'timestamptz', nullable: true })
  routeOptimizedAt!: Date | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
