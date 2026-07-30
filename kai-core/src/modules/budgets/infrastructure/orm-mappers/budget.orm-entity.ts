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
import { ResultCenterOrmEntity } from '@modules/result-centers/infrastructure/orm-mappers/result-center.orm-entity';
import { UserOrmEntity } from '@modules/users/infrastructure/orm-mappers/user.orm-entity';

export enum BudgetCurrency {
  CLP = 'CLP',
}

export enum BudgetStatus {
  ACTIVE = 'ACTIVE',
  SUPERSEDED = 'SUPERSEDED',
  CANCELLED = 'CANCELLED',
}

@Entity('budgets')
export class BudgetOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  resultCenterId!: string;

  @Column({ type: 'date' })
  periodStart!: string;

  @Column({ type: 'date' })
  periodEnd!: string;

  @Column({ type: 'bigint' })
  budgetedAmount!: string;

  @Column({ type: 'bigint', default: 0 })
  spentAmount!: string;

  @Column({ type: 'varchar', length: 10, default: BudgetCurrency.CLP })
  currency!: BudgetCurrency;

  @Column({ type: 'varchar', length: 50, default: BudgetStatus.ACTIVE })
  status!: BudgetStatus;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => CompanyOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: CompanyOrmEntity;

  @ManyToOne(() => ResultCenterOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resultCenterId' })
  resultCenter!: ResultCenterOrmEntity;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'createdBy' })
  createdByUser!: UserOrmEntity;
}
