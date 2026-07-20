import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from '@modules/companies/domain/company.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { ResultCenter } from '@modules/result-centers/domain/result-center.entity';
import { OrganizationalUnit } from '@modules/organizational-units/domain/organizational-unit.entity';

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACTOR = 'CONTRACTOR',
  TEMPORARY = 'TEMPORARY',
  INTERN = 'INTERN',
}

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

export enum WorkRegime {
  ORDINARY = 'ORDINARY',
  PARTIAL = 'PARTIAL',
  EXCEPTIONAL_ART38 = 'EXCEPTIONAL_ART38',
}

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  personId!: string;

  @Column({ type: 'uuid', nullable: true })
  branchId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  resultCenterId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  organizationalUnitId?: string | null;

  /** Unidad laboral obligatoria (exactamente una). */
  @Column({ type: 'uuid' })
  laborUnitId!: string;

  @Column({
    type: 'enum',
    enum: EmploymentType,
    default: EmploymentType.FULL_TIME,
  })
  employmentType!: EmploymentType;

  @Column({
    type: 'enum',
    enum: EmployeeStatus,
    default: EmployeeStatus.ACTIVE,
  })
  status!: EmployeeStatus;

  @Column({
    type: 'enum',
    enum: WorkRegime,
    default: WorkRegime.ORDINARY,
  })
  workRegime!: WorkRegime;

  @Column({ type: 'date' })
  hireDate!: string;

  @Column({ type: 'date', nullable: true })
  terminationDate?: string | null;

  @Column({ type: 'bigint', nullable: true })
  baseSalary?: string | null;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company?: Company;

  @ManyToOne(() => Person, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'personId' })
  person?: Person;

  @ManyToOne(() => Branch, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branchId' })
  branch?: Branch | null;

  @ManyToOne(() => ResultCenter, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resultCenterId' })
  resultCenter?: ResultCenter | null;

  @ManyToOne(() => OrganizationalUnit, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'organizationalUnitId' })
  organizationalUnit?: OrganizationalUnit | null;

  constructor(data?: Partial<Employee>) {
    if (data) Object.assign(this, data);
  }
}
