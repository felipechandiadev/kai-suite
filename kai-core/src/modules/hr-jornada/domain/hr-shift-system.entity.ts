import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { ShiftSystemType } from './shift-system.enums';

@Entity('hr_shift_systems')
@Index(['companyId'])
export class HrShiftSystem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 32 })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 32 })
  type!: ShiftSystemType;

  @Column({ type: 'boolean', default: false })
  requiresPlannerAssignment!: boolean;

  @Column({ type: 'boolean', default: true })
  generatesLateEvents!: boolean;

  @Column({ type: 'boolean', default: true })
  overtimeEnabled!: boolean;

  /** Solo EXCEPTIONAL: { daysOn, daysOff } para patrones cíclicos. */
  @Column({ type: 'jsonb', nullable: true })
  cycleConfigJson?: { daysOn?: number; daysOff?: number } | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;
}
