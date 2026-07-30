import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('hr_schedule_finding_audits')
@Index(['companyId', 'createdAt'])
export class HrScheduleFindingAudit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ type: 'date' })
  weekStart!: string;

  @Column({ type: 'jsonb' })
  findings!: unknown[];

  @Column({ type: 'text', nullable: true })
  overrideReason?: string | null;

  @Column({ type: 'varchar', length: 16 })
  worstSeverity!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
