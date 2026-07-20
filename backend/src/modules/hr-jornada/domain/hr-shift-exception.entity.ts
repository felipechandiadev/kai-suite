import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ShiftExceptionType } from './hr-jornada.enums';
import { HrShiftAssignment } from './hr-shift-assignment.entity';

@Entity('hr_shift_exceptions')
@Index(['companyId', 'employeeId'])
@Index(['assignmentId'])
export class HrShiftException {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  employeeId!: string;

  @Column({ type: 'uuid', nullable: true })
  assignmentId?: string | null;

  @Column({ type: 'date' })
  workDate!: string;

  @Column({ type: 'varchar', length: 32 })
  type!: ShiftExceptionType;

  @Column({ type: 'int', default: 0 })
  minutes!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'boolean', default: true })
  affectsPayroll!: boolean;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string | null;

  @Column({ type: 'boolean', default: false })
  settled!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  settledAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt?: Date | null;

  @ManyToOne(() => HrShiftAssignment, (a) => a.exceptions, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'assignmentId' })
  assignment?: HrShiftAssignment | null;
}
