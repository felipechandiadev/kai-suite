import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum HrEmployeeTimelineKind {
  NOTE = 'NOTE',
  CONTRACT_CREATED = 'CONTRACT_CREATED',
  CONTRACT_SUPERSEDED = 'CONTRACT_SUPERSEDED',
  SHIFT_CHANGED = 'SHIFT_CHANGED',
  ORG_UNIT_CHANGED = 'ORG_UNIT_CHANGED',
  LABOR_UNIT_CHANGED = 'LABOR_UNIT_CHANGED',
  EMPLOYEE_UPDATED = 'EMPLOYEE_UPDATED',
  SCHEDULE_EXCEPTION = 'SCHEDULE_EXCEPTION',
  PAYROLL_CREATED = 'PAYROLL_CREATED',
  PAYROLL_PAID = 'PAYROLL_PAID',
}

@Entity('hr_employee_timeline_entries')
@Index(['companyId', 'employeeId', 'occurredAt'])
export class HrEmployeeTimelineEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  employeeId!: string;

  @Column({ type: 'timestamptz' })
  occurredAt!: Date;

  @Column({ type: 'varchar', length: 64 })
  kind!: HrEmployeeTimelineKind | string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  body?: string | null;

  @Column({ type: 'uuid', nullable: true })
  actorUserId?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  sourceType?: string | null;

  @Column({ type: 'uuid', nullable: true })
  sourceId?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  payload?: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
