import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CompanyOrmEntity } from '@modules/companies/infrastructure/orm-mappers/company.orm-entity';

export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

@Entity('accounting_accounts')
@Index(['companyId', 'code'], { unique: true })
export class AccountingAccountOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 20 })
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  type!: AccountType;

  @Column({ type: 'uuid', nullable: true })
  parentId?: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => CompanyOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: CompanyOrmEntity;

  @ManyToOne(() => AccountingAccountOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent?: AccountingAccountOrmEntity | null;
}
