import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('hr_holidays')
@Index(['date'], { unique: true })
export class HrHoliday {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ type: 'varchar', length: 8, default: 'CL' })
  countryCode!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

@Entity('hr_holiday_overrides')
@Index(['companyId', 'date'], { unique: true })
export class HrHolidayOverride {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  /** Si true, el día deja de ser festivo para la company. */
  @Column({ type: 'boolean', default: false })
  isRemoved!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
