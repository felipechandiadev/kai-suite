import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { ShiftTemplateType } from './hr-jornada.enums';

export enum EmployeeShiftStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('hr_employee_shifts')
@Index(['companyId', 'employeeId'])
export class HrEmployeeShift {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  employeeId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 32, default: ShiftTemplateType.WEEKLY })
  type!: ShiftTemplateType;

  /** { "0": { "start": "09:00", "end": "18:00" }, ... } 0=lun … 6=dom */
  @Column({ type: 'jsonb', nullable: true })
  scheduleJson?: Record<string, { start?: string; end?: string } | null> | null;

  @Column({ type: 'varchar', length: 64, default: 'America/Santiago' })
  timezone!: string;

  @Column({ type: 'uuid', nullable: true })
  templateId?: string | null;

  @Column({ type: 'boolean', default: false })
  isNight!: boolean;

  @Column({ type: 'boolean', default: false })
  isNightOutgoing!: boolean;

  @Column({ type: 'varchar', length: 16, default: EmployeeShiftStatus.ACTIVE })
  status!: EmployeeShiftStatus;

  @Column({ type: 'date', nullable: true })
  effectiveFrom?: string | null;

  @Column({ type: 'date', nullable: true })
  effectiveTo?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt?: Date | null;
}
