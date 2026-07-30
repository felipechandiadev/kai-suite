import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TransactionOrmEntity } from '@modules/transactions/infrastructure/orm-mappers/transaction.orm-entity';
import { AccountingAccountOrmEntity } from '@modules/accounting-accounts/infrastructure/orm-mappers/accounting-account.orm-entity';
import { PersonOrmEntity as Person } from '@modules/persons/infrastructure/orm-mappers/person.orm-entity';

@Entity('ledger_entries')
@Index(['transactionId'])
@Index(['accountId', 'entryDate'])
@Index(['personId', 'entryDate'])
export class LedgerEntryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  transactionId!: string;

  @Column({ type: 'uuid' })
  accountId!: string;

  @Column({ type: 'uuid', nullable: true })
  personId?: string | null;

  @Column({ type: 'timestamp' })
  entryDate!: Date;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  debit!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  credit!: number;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => TransactionOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transactionId' })
  transaction!: TransactionOrmEntity;

  @ManyToOne(() => AccountingAccountOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'accountId' })
  account!: AccountingAccountOrmEntity;

  @ManyToOne(() => Person, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'personId' })
  person?: Person | null;
}
