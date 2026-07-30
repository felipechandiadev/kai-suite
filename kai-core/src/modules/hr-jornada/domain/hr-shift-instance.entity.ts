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
import { HrShiftTemplate } from './hr-shift-template.entity';
import { HrShiftAssignment } from './hr-shift-assignment.entity';

@Entity('hr_shift_instances')
@Index(['companyId', 'workDate'])
export class HrShiftInstance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid', nullable: true })
  templateId?: string | null;

  @Column({ type: 'date' })
  workDate!: string;

  /** HH:mm */
  @Column({ type: 'varchar', length: 5 })
  startTime!: string;

  /** HH:mm */
  @Column({ type: 'varchar', length: 5 })
  endTime!: string;

  @Column({ type: 'varchar', length: 64, default: 'America/Santiago' })
  timezone!: string;

  @Column({ type: 'boolean', default: false })
  isNight!: boolean;

  @Column({ type: 'boolean', default: false })
  isNightOutgoing!: boolean;

  /** Turno UL origen (opcional); evita fusionar bloques con mismo horario. */
  @Column({ type: 'uuid', nullable: true })
  laborUnitShiftId?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt?: Date | null;

  @ManyToOne(() => HrShiftTemplate, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'templateId' })
  template?: HrShiftTemplate | null;

  @OneToMany(() => HrShiftAssignment, (a) => a.instance)
  assignments?: HrShiftAssignment[];
}
