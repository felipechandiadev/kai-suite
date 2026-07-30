import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

@Entity('hr_labor_unit_shifts')
@Index(['companyId', 'laborUnitId'])
export class HrLaborUnitShift {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  laborUnitId!: string;

  /** Auto: ULS00001 */
  @Column({ type: 'varchar', length: 32 })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  /** { "0": { "start": "09:00", "end": "18:00" }, ... } 0=lun … 6=dom */
  @Column({ type: 'jsonb', nullable: true })
  scheduleJson?: Record<string, { start?: string; end?: string } | null> | null;

  @Column({ type: 'varchar', length: 64, default: 'America/Santiago' })
  timezone!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'date', nullable: true })
  effectiveFrom?: string | null;

  @Column({ type: 'date', nullable: true })
  effectiveTo?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;
}
