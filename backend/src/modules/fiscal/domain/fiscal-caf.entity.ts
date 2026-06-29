import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SiiEnvironment } from './fiscal.enums';

@Entity('fiscal_cafs')
export class FiscalCaf {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'dte_type', type: 'smallint', default: 39 })
  dteType!: number;

  @Column({ name: 'range_from', type: 'int' })
  rangeFrom!: number;

  @Column({ name: 'range_to', type: 'int' })
  rangeTo!: number;

  @Column({ name: 'next_folio', type: 'int' })
  nextFolio!: number;

  @Column({ type: 'varchar', length: 32, default: SiiEnvironment.CERTIFICATION })
  environment!: SiiEnvironment;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'encrypted_caf_xml', type: 'bytea' })
  encryptedCafXml!: Buffer;

  @Column({ name: 'caf_iv', type: 'varchar', length: 32 })
  cafIv!: string;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt!: Date;
}
