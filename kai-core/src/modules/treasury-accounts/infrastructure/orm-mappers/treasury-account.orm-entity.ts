import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CompanyOrmEntity } from '@modules/companies/infrastructure/orm-mappers/company.orm-entity';
import { BranchOrmEntity } from '@modules/branches/infrastructure/orm-mappers/branch.orm-entity';

export enum TreasuryAccountTypeOrm {
  BANK = 'BANK',
  CASH = 'CASH',
  VIRTUAL = 'VIRTUAL',
}

@Entity('treasury_accounts')
export class TreasuryAccountOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid', nullable: true })
  branchId?: string | null;

  @Column({ type: 'varchar', length: 50 })
  type!: TreasuryAccountTypeOrm;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bankName?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  accountNumber?: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => CompanyOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: CompanyOrmEntity;

  @ManyToOne(() => BranchOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branchId' })
  branch?: BranchOrmEntity | null;
}
