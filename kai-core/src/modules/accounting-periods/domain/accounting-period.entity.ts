import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Company } from '@modules/companies/domain/company.entity';
import { User } from '@modules/users/domain/user.entity';

export enum AccountingPeriodStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  LOCKED = 'LOCKED',
}

@Entity('accounting_periods')
@Unique('UQ_accounting_period_company_month', [
  'companyId',
  'startDate',
  'endDate',
])
@Index(['companyId', 'startDate'])
export class AccountingPeriod {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'date' })
  startDate!: string;

  @Column({ type: 'date' })
  endDate!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  name?: string | null;

  @Column({
    type: 'enum',
    enum: AccountingPeriodStatus,
    default: AccountingPeriodStatus.OPEN,
  })
  status!: AccountingPeriodStatus;

  @Column({ type: 'timestamp', nullable: true })
  closedAt?: Date | null;

  @Column({ type: 'uuid', nullable: true })
  closedBy?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'closedBy' })
  closedByUser?: User | null;
}
