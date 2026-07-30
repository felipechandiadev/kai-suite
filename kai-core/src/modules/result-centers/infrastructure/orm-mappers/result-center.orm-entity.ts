import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { CompanyOrmEntity } from '@modules/companies/infrastructure/orm-mappers/company.orm-entity';
import { BranchOrmEntity } from '@modules/branches/infrastructure/orm-mappers/branch.orm-entity';

export enum ResultCenterType {
  DIRECT = 'DIRECT',
  SUPPORT = 'SUPPORT',
  ADMIN = 'ADMIN',
  INVESTMENT = 'INVESTMENT',
  SALES = 'SALES',
  OPERATIONS = 'OPERATIONS',
  MARKETING = 'MARKETING',
  OTHER = 'OTHER',
}

@Entity('result_centers')
export class ResultCenterOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid', nullable: true })
  parentId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  branchId?: string | null;

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50, default: ResultCenterType.OTHER })
  type!: ResultCenterType;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => CompanyOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: CompanyOrmEntity;

  @ManyToOne(() => ResultCenterOrmEntity, (rc) => rc.children, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parentId' })
  parent?: ResultCenterOrmEntity | null;

  @OneToMany(() => ResultCenterOrmEntity, (rc) => rc.parent)
  children?: ResultCenterOrmEntity[];

  @ManyToOne(() => BranchOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branchId' })
  branch?: BranchOrmEntity | null;
}
