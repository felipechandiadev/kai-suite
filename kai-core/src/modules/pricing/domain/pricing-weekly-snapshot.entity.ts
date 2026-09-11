import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import type { PricingSnapshotStatus } from './pricing.types';
import { PricingWeeklySnapshotLine } from './pricing-weekly-snapshot-line.entity';

@Entity('pricing_weekly_snapshots')
@Index('idx_pricing_snapshots_company_week', ['companyId', 'weekIso'])
export class PricingWeeklySnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 10 })
  weekIso!: string;

  @Column({ type: 'uuid', nullable: true })
  branchId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  categoryId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  priceListId?: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 35 })
  targetMarginPercent!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  gfPoolNet!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  companyNetSales!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  entityNetSales!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  gfQuota!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  unitQuota!: string;

  @Column({ type: 'date' })
  salesWindowFrom!: string;

  @Column({ type: 'date' })
  salesWindowTo!: string;

  @Column({ type: 'varchar', length: 20, default: 'DRAFT' })
  status!: PricingSnapshotStatus;

  @Column({ type: 'timestamp', nullable: true })
  appliedAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => PricingWeeklySnapshotLine, (line) => line.snapshot)
  lines?: PricingWeeklySnapshotLine[];
}
