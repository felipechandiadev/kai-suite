import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AccountingPeriodOrmEntity } from '@modules/accounting-periods/infrastructure/orm-mappers/accounting-period.orm-entity';

@Entity('accounting_period_snapshots')
export class AccountingPeriodSnapshotOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  accountingPeriodId!: string;

  @Column({ type: 'json', nullable: true })
  snapshotData?: Record<string, any> | null;

  @ManyToOne(() => AccountingPeriodOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accountingPeriodId' })
  accountingPeriod?: AccountingPeriodOrmEntity;
}
