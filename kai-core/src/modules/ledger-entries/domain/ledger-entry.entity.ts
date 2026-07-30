import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { Person } from '@modules/persons/domain/person.entity';

/**
 * LIBRO DIARIO PERSISTENTE (GENERAL LEDGER)
 *
 * Esta entidad registra físicamente cada movimiento contable
 * derivado de una transacción. Es la base de la inmutabilidad
 * financiera del ERP.
 */
@Entity('ledger_entries')
@Index(['transactionId'])
@Index(['accountId', 'entryDate'])
@Index(['personId', 'entryDate']) // Para contabilidad auxiliar
@Index('idx_ledger_entries_company_id', ['companyId'])
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  transactionId!: string;

  @Column({ type: 'uuid' })
  accountId!: string;

  // Auxiliar Contable: Vincula el asiento con un Cliente, Proveedor o Socio
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

  // Relaciones
  @ManyToOne(() => Transaction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transactionId' })
  transaction!: Transaction;

  @ManyToOne(() => AccountingAccount, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'accountId' })
  account!: AccountingAccount;

  @ManyToOne(() => Person, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'personId' })
  person?: Person | null;
}
