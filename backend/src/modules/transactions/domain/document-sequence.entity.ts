import 'reflect-metadata';
import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * Contador atómico por sucursal + tipo de transacción + año calendario
 * para folios `SIGLAYY00001` (sin guiones; correlativo mín. 5 dígitos).
 */
@Entity('document_sequences')
@Unique('UQ_document_sequences_scope', ['branchId', 'transactionType', 'year'])
export class DocumentSequence {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_document_sequences_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @Column({ type: 'varchar', length: 64 })
  transactionType!: string;

  @Column({ type: 'int' })
  year!: number;

  @Column({ type: 'int', default: 0 })
  lastNumber!: number;
}
