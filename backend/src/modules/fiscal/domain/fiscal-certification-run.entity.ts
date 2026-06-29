import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CertificationRunStatus } from './fiscal.enums';

@Entity('fiscal_certification_runs')
export class FiscalCertificationRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 48, default: CertificationRunStatus.DRAFT })
  status!: CertificationRunStatus;

  @Column({ name: 'folio_from', type: 'int', nullable: true })
  folioFrom?: number | null;

  @Column({ name: 'folio_to', type: 'int', nullable: true })
  folioTo?: number | null;

  @Column({ name: 'boleta_track_id', type: 'varchar', length: 64, nullable: true })
  boletaTrackId?: string | null;

  @Column({ name: 'rco_track_id', type: 'varchar', length: 64, nullable: true })
  rcoTrackId?: string | null;

  @Column({ name: 'boleta_envio_status', type: 'varchar', length: 16, nullable: true })
  boletaEnvioStatus?: string | null;

  @Column({ name: 'rco_envio_status', type: 'varchar', length: 16, nullable: true })
  rcoEnvioStatus?: string | null;

  @Column({ name: 'generated_preview', type: 'jsonb', nullable: true })
  generatedPreview?: Record<string, unknown>[] | null;

  @Column({ name: 'error_detail', type: 'jsonb', nullable: true })
  errorDetail?: Record<string, unknown> | null;

  @Column({ name: 'portal_validated', type: 'boolean', default: false })
  portalValidated!: boolean;

  @Column({ name: 'portal_declaration_done', type: 'boolean', default: false })
  portalDeclarationDone!: boolean;

  @CreateDateColumn({ name: 'started_at' })
  startedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
