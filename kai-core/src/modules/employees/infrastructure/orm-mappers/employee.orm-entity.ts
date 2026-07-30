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
import { CompanyOrmEntity } from '@modules/companies/infrastructure/orm-mappers/company.orm-entity';
import { PersonOrmEntity } from '@modules/persons/infrastructure/orm-mappers/person.orm-entity';
import { BranchOrmEntity } from '@modules/branches/infrastructure/orm-mappers/branch.orm-entity';
import { ResultCenterOrmEntity } from '@modules/result-centers/infrastructure/orm-mappers/result-center.orm-entity';
import { OrganizationalUnitOrmEntity } from '@modules/organizational-units/infrastructure/orm-mappers/organizational-unit.orm-entity';

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

@Entity('employees')
export class EmployeeOrmEntity {
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

  @Column({ type: 'varchar', length: 50, default: EmploymentType.FULL_TIME })
  employmentType!: EmploymentType;

  @Column({ type: 'varchar', length: 50, default: EmployeeStatus.ACTIVE })
  status!: EmployeeStatus;

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

  @ManyToOne(() => CompanyOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: CompanyOrmEntity;

  @ManyToOne(() => PersonOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'personId' })
  person!: PersonOrmEntity;

  @ManyToOne(() => BranchOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branchId' })
  branch?: BranchOrmEntity | null;

  @ManyToOne(() => ResultCenterOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resultCenterId' })
  resultCenter?: ResultCenterOrmEntity | null;

  @ManyToOne(() => OrganizationalUnitOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'organizationalUnitId' })
  organizationalUnit?: OrganizationalUnitOrmEntity | null;
}
