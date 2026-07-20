import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FiscalProfileStatus, SiiEnvironment } from './fiscal.enums';
import {
  type FiscalDocumentFamilies,
  normalizeFiscalDocumentFamilies,
} from './fiscal-document-family';

@Entity('fiscal_profiles')
export class FiscalProfile {
  @PrimaryColumn({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({
    type: 'varchar',
    length: 32,
    default: SiiEnvironment.CERTIFICATION,
  })
  environment!: SiiEnvironment;

  @Column({
    type: 'varchar',
    length: 48,
    default: FiscalProfileStatus.DRAFT,
  })
  status!: FiscalProfileStatus;

  @Column({ name: 'legal_name', type: 'varchar', length: 255, nullable: true })
  legalName?: string | null;

  @Column({ name: 'rut', type: 'varchar', length: 14, nullable: true })
  rut?: string | null;

  @Column({ name: 'business_activity', type: 'varchar', length: 255, nullable: true })
  businessActivity?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  commune?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  city?: string | null;

  @Column({ name: 'resolution_number', type: 'varchar', length: 64, nullable: true })
  resolutionNumber?: string | null;

  @Column({ name: 'resolution_date', type: 'date', nullable: true })
  resolutionDate?: string | null;

  @Column({ name: 'production_enabled', type: 'boolean', default: false })
  productionEnabled!: boolean;

  @Column({ name: 'portal_postulation_done', type: 'boolean', default: false })
  portalPostulationDone!: boolean;

  @Column({ name: 'portal_permissions_done', type: 'boolean', default: false })
  portalPermissionsDone!: boolean;

  @Column({
    name: 'enabled_document_families',
    type: 'jsonb',
    default: () =>
      `'{"boleta":true,"factura":false,"notaCredito":false,"guiaDespacho":false}'`,
  })
  enabledDocumentFamilies!: FiscalDocumentFamilies;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
