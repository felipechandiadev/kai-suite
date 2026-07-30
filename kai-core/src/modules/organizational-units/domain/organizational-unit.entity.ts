import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Company } from '@modules/companies/domain/company.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { ResultCenter } from '@modules/result-centers/domain/result-center.entity';

export enum OrganizationalUnitType {
  HEADQUARTERS = 'HEADQUARTERS',
  STORE = 'STORE',
  BACKOFFICE = 'BACKOFFICE',
  OPERATIONS = 'OPERATIONS',
  SALES = 'SALES',
  OTHER = 'OTHER',
}

@Entity('organizational_units')
export class OrganizationalUnit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  companyId!: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    type: 'enum',
    enum: OrganizationalUnitType,
    default: OrganizationalUnitType.OTHER,
  })
  unitType!: OrganizationalUnitType;

  @Column({ type: 'uuid', nullable: true })
  parentId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  branchId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  resultCenterId?: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

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
  company!: Company;

  @ManyToOne(() => OrganizationalUnit, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent?: OrganizationalUnit | null;

  @ManyToOne(() => Branch, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branchId' })
  branch?: Branch | null;

  @ManyToOne(() => ResultCenter, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resultCenterId' })
  resultCenter?: ResultCenter | null;
}
