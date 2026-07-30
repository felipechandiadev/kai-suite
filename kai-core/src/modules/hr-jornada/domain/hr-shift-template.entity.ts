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

@Entity('hr_shift_templates')
@Index(['companyId'])
export class HrShiftTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 32 })
  type!: ShiftTemplateType;

  @Column({ type: 'boolean', default: false })
  isNight!: boolean;

  @Column({ type: 'boolean', default: false })
  isNightOutgoing!: boolean;

  /** Horarios por día (0=lun…6=dom) u slots rotativos. */
  @Column({ type: 'jsonb', nullable: true })
  scheduleJson?: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  timezone?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt?: Date | null;
}
