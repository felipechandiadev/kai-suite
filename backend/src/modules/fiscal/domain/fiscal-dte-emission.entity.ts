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
@Index('idx_fiscal_dte_emissions_caf', ['cafId'])
@Index('idx_fiscal_dte_emissions_allocation', ['allocationId'])
export class FiscalDteEmission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId!: string;

  @Column({ name: 'point_of_sale_id', type: 'uuid', nullable: true })
  pointOfSaleId?: string | null;

  @Column({ name: 'caf_id', type: 'uuid', nullable: true })
  cafId?: string | null;

  @Column({ name: 'allocation_id', type: 'uuid', nullable: true })
  allocationId?: string | null;

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

  @Column({ name: 'encrypted_signed_envio', type: 'text', nullable: true })
  encryptedSignedEnvio?: string | null;

  @Column({ name: 'signed_envio_iv', type: 'varchar', length: 32, nullable: true })
  signedEnvioIv?: string | null;

  @Column({ name: 'submit_attempts', type: 'smallint', default: 0 })
  submitAttempts!: number;

  @Column({ name: 'poll_attempts', type: 'smallint', default: 0 })
  pollAttempts!: number;

  @Column({ name: 'next_retry_at', type: 'timestamptz', nullable: true })
  nextRetryAt?: Date | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt?: Date | null;

  @Column({ name: 'processing_claimed_at', type: 'timestamptz', nullable: true })
  processingClaimedAt?: Date | null;

  @Column({ name: 'sii_poll_after', type: 'timestamptz', nullable: true })
  siiPollAfter?: Date | null;

  @Column({ name: 'error_detail', type: 'jsonb', nullable: true })
  errorDetail?: Record<string, unknown> | null;

  @Column({ name: 'issued_at', type: 'date' })
  issuedAt!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
