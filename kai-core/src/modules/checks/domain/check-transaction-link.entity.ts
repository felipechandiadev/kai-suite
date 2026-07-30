import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Check } from './check.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';

export enum CheckTransactionLinkRole {
  /** Transacción que originó el cheque (venta para INCOMING, pago para OUTGOING). */
  ORIGIN = 'ORIGIN',
  /** Transacción a la que se aplicó por endoso un cheque INCOMING. */
  ENDORSED_TO = 'ENDORSED_TO',
}

/**
 * Tabla pivote N:M entre cheques y transacciones. Permite modelar endoso
 * (un cheque entrante que luego se aplica como pago a un proveedor) y
 * aplicación parcial a múltiples documentos sin tocar la transacción
 * inmutable.
 */
@Entity('check_transaction_links')
@Unique('uq_check_tx_link_role', ['checkId', 'transactionId', 'role'])
@Index('idx_check_tx_link_check', ['checkId'])
@Index('idx_check_tx_link_transaction', ['transactionId'])
export class CheckTransactionLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_check_tx_link_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  checkId!: string;

  @Column({ type: 'uuid' })
  transactionId!: string;

  @Column({ type: 'enum', enum: CheckTransactionLinkRole })
  role!: CheckTransactionLinkRole;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Check, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'checkId' })
  check?: Check;

  @ManyToOne(() => Transaction, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'transactionId' })
  transaction?: Transaction;
}
