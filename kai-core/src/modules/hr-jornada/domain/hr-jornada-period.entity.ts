import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum JornadaPeriodStatus {
  DRAFT = 'DRAFT',
  CLOSED = 'CLOSED',
}

@Entity('hr_jornada_periods')
@Index(['companyId', 'periodStart'], { unique: true })
export class HrJornadaPeriod {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  /** Primer día del mes (YYYY-MM-01). */
  @Column({ type: 'date' })
  periodStart!: string;

  /** Último día del mes. */
  @Column({ type: 'date' })
  periodEnd!: string;

  @Column({
    type: 'varchar',
    length: 16,
    default: JornadaPeriodStatus.DRAFT,
  })
  status!: JornadaPeriodStatus;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt?: Date | null;

  @Column({ type: 'uuid', nullable: true })
  closedByUserId?: string | null;

  /** Totales HE, hallazgos, hash al cerrar. */
  @Column({ type: 'jsonb', nullable: true })
  snapshotJson?: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
