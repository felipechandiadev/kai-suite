import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from '@modules/companies/domain/company.entity';
import { ResultCenter } from '@modules/result-centers/domain/result-center.entity';
import { User } from '@modules/users/domain/user.entity';

export enum BudgetCurrency {
  CLP = 'CLP',
}

export enum BudgetStatus {
  ACTIVE = 'ACTIVE',
  SUPERSEDED = 'SUPERSEDED',
  CANCELLED = 'CANCELLED',
}

@Entity('budgets')
export class Budget {
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

  @Column({ type: 'enum', enum: BudgetCurrency, default: BudgetCurrency.CLP })
  currency!: BudgetCurrency;

  @Column({ type: 'enum', enum: BudgetStatus, default: BudgetStatus.ACTIVE })
  status!: BudgetStatus;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @ManyToOne(() => ResultCenter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resultCenterId' })
  resultCenter!: ResultCenter;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'createdBy' })
  createdByUser!: User;
}
