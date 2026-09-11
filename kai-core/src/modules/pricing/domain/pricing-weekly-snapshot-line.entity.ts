import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { PricingAlertLevel } from './pricing.types';
import { PricingWeeklySnapshot } from './pricing-weekly-snapshot.entity';

@Entity('pricing_weekly_snapshot_lines')
@Index('idx_pricing_snapshot_lines_snapshot', ['snapshotId'])
export class PricingWeeklySnapshotLine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  snapshotId!: string;

  @Column({ type: 'uuid' })
  variantId!: string;

  @Column({ type: 'uuid' })
  productId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sku?: string | null;

  @Column({ type: 'varchar', length: 255 })
  productName!: string;

  @Column({ type: 'uuid', nullable: true })
  categoryId?: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  floorNet!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  listNet!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  listGross!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  unitQuota!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  peNet!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  targetNet!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  suggestedNet!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  suggestedGross!: string;

  @Column({ type: 'varchar', length: 30, default: 'INSUFFICIENT_DATA' })
  alert!: PricingAlertLevel;

  @Column({ type: 'decimal', precision: 15, scale: 4, default: 0 })
  unitsInWindow!: string;

  @ManyToOne(() => PricingWeeklySnapshot, (s) => s.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'snapshotId' })
  snapshot?: PricingWeeklySnapshot;
}
