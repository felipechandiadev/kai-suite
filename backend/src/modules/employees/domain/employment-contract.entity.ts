import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { WorkRegime } from './employee.entity';
import {
  EmploymentContractKind,
  EmploymentContractStatus,
  EmploymentLaborType,
  SalesCommissionType,
} from './employment-contract.enums';

@Entity('hr_employment_contracts')
@Index(['companyId', 'employeeId'])
export class EmploymentContract {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  employeeId!: string;

  @Column({ type: 'uuid', nullable: true })
  branchId?: string | null;

  @Column({ type: 'varchar', length: 16 })
  kind!: EmploymentContractKind;

  @Column({ type: 'varchar', length: 32, nullable: true })
  laborType?: EmploymentLaborType | null;

  @Column({ type: 'varchar', length: 16, default: EmploymentContractStatus.DRAFT })
  status!: EmploymentContractStatus;

  @Column({ type: 'date' })
  startDate!: string;

  @Column({ type: 'date', nullable: true })
  endDate?: string | null;

  /** Sueldo base (LABOR), centavos/pesos según convención Employee.baseSalary. */
  @Column({ type: 'bigint', nullable: true })
  baseSalary?: string | null;

  /** Monto honorario (FEE). */
  @Column({ type: 'bigint', nullable: true })
  feeAmount?: string | null;

  @Column({
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  workRegime?: WorkRegime | null;

  @Column({ type: 'numeric', precision: 4, scale: 1, nullable: true })
  weeklyHours?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  extraHoursMode?: string | null;

  @Column({ type: 'bigint', default: '0' })
  mealAllowance!: string;

  @Column({ type: 'bigint', default: '0' })
  transportAllowance!: string;

  /** Eligible for tips / propinas distribution. */
  @Column({ type: 'boolean', default: false })
  tipsEligible!: boolean;

  @Column({ type: 'uuid', nullable: true })
  afpId?: string | null;

  /** Snapshot of AFP code at contract version time. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  afpCode?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  afpName?: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  afpContributionPercent?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  healthSystem?: string | null;

  @Column({ type: 'uuid', nullable: true })
  isapreId?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  isapreCode?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  isapreName?: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  healthContributionMode?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  healthContributionValue?: string | null;

  /** Mutual / ISL display name (texto; sin FK en M1). */
  @Column({ type: 'varchar', length: 150, nullable: true })
  mutualName?: string | null;

  @Column({ type: 'uuid', nullable: true })
  shiftSystemId?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  shiftSystemCode?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  shiftSystemName?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  shiftSystemType?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  fixedScheduleJson?: Record<string, { start?: string; end?: string } | null> | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  flexibleMode?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  flexibleBandJson?: Record<string, { earliestStart?: string; latestStart?: string; earliestEnd?: string; latestEnd?: string } | null> | null;

  @Column({ type: 'boolean', nullable: true })
  art22Exempt?: boolean | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  exceptionalResolutionRef?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  documentUrl?: string | null;

  /** Previous ACTIVE contract this version replaces (immutable history). */
  @Column({ type: 'uuid', nullable: true })
  supersedesContractId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  jobPositionId?: string | null;

  /** Snapshot of job duties at contract version time. */
  @Column({ type: 'text', nullable: true })
  duties?: string | null;

  @Column({
    type: 'varchar',
    length: 16,
    default: SalesCommissionType.NONE,
  })
  salesCommissionType!: SalesCommissionType;

  @Column({ type: 'varchar', length: 32, nullable: true })
  salesCommissionValue?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
