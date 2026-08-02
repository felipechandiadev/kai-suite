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
  OneToMany,
} from 'typeorm';
import { HrShiftInstance } from './hr-shift-instance.entity';
import { HrShiftException } from './hr-shift-exception.entity';

@Entity('hr_shift_assignments')
@Index(['companyId', 'employeeId'])
@Index(['instanceId', 'employeeId'], { unique: true })
export class HrShiftAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  instanceId!: string;

  @Column({ type: 'uuid' })
  employeeId!: string;

  /** HH:mm — jornada de la persona; si null, hereda la banda de la instancia. */
  @Column({ type: 'varchar', length: 5, nullable: true })
  startTime?: string | null;

  /** HH:mm — jornada de la persona; si null, hereda la banda de la instancia. */
  @Column({ type: 'varchar', length: 5, nullable: true })
  endTime?: string | null;

  @Column({ type: 'int', default: 0 })
  plannedOvertimeMinutes!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt?: Date | null;

  @ManyToOne(() => HrShiftInstance, (i) => i.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'instanceId' })
  instance?: HrShiftInstance;

  @OneToMany(() => HrShiftException, (e) => e.assignment)
  exceptions?: HrShiftException[];
}
