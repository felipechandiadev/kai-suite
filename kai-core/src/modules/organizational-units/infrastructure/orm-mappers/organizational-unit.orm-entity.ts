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
import { CompanyOrmEntity } from '@modules/companies/infrastructure/orm-mappers/company.orm-entity';
import { BranchOrmEntity } from '@modules/branches/infrastructure/orm-mappers/branch.orm-entity';
import { ResultCenterOrmEntity } from '@modules/result-centers/infrastructure/orm-mappers/result-center.orm-entity';

export enum OrganizationalUnitType {
  HEADQUARTERS = 'HEADQUARTERS',
  STORE = 'STORE',
  BACKOFFICE = 'BACKOFFICE',
  OPERATIONS = 'OPERATIONS',
  SALES = 'SALES',
  OTHER = 'OTHER',
}

@Entity('organizational_units')
export class OrganizationalUnitOrmEntity {
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
    type: 'varchar',
    length: 50,
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

  @ManyToOne(() => CompanyOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: CompanyOrmEntity;

  @ManyToOne(() => OrganizationalUnitOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent?: OrganizationalUnitOrmEntity | null;

  @ManyToOne(() => BranchOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branchId' })
  branch?: BranchOrmEntity | null;

  @ManyToOne(() => ResultCenterOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resultCenterId' })
  resultCenter?: ResultCenterOrmEntity | null;
}
