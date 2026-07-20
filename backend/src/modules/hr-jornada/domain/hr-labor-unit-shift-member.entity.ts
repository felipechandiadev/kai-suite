import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum LaborUnitShiftMemberStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('hr_labor_unit_shift_members')
@Index(['companyId', 'employeeId'])
@Index(['companyId', 'shiftId'])
export class HrLaborUnitShiftMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  shiftId!: string;

  @Column({ type: 'uuid' })
  employeeId!: string;

  @Column({
    type: 'varchar',
    length: 16,
    default: LaborUnitShiftMemberStatus.ACTIVE,
  })
  status!: LaborUnitShiftMemberStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
