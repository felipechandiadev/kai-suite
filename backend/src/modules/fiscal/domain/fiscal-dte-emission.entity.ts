import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FiscalDteEmissionStatus, SiiEnvironment } from './fiscal.enums';

@Entity('fiscal_dte_emissions')
@Index('uq_fiscal_dte_emissions_transaction', ['transactionId'], { unique: true })
@Index('idx_fiscal_dte_emissions_company', ['companyId'])
export class FiscalDteEmission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId!: string;

  @Column({ name: 'dte_type', type: 'smallint', default: 39 })
  dteType!: number;

  @Column({ type: 'int' })
  folio!: number;

  @Column({ type: 'varchar', length: 32 })
  environment!: SiiEnvironment;

  @Column({ name: 'receptor_rut', type: 'varchar', length: 14 })
  receptorRut!: string;

  @Column({ name: 'receptor_name', type: 'varchar', length: 120 })
  receptorName!: string;

  @Column({ name: 'track_id', type: 'varchar', length: 64, nullable: true })
  trackId?: string | null;

  @Column({ name: 'envio_status', type: 'varchar', length: 16 })
  envioStatus!: FiscalDteEmissionStatus;

  @Column({ name: 'ted_xml', type: 'text', nullable: true })
  tedXml?: string | null;

  @Column({ name: 'error_detail', type: 'jsonb', nullable: true })
  errorDetail?: Record<string, unknown> | null;

  @Column({ name: 'issued_at', type: 'date' })
  issuedAt!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
