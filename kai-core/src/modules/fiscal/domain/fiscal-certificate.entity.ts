import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('fiscal_certificates')
export class FiscalCertificate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'subject_rut', type: 'varchar', length: 14, nullable: true })
  subjectRut?: string | null;

  @Column({ name: 'not_before', type: 'timestamptz', nullable: true })
  notBefore?: Date | null;

  @Column({ name: 'not_after', type: 'timestamptz', nullable: true })
  notAfter?: Date | null;

  @Column({ name: 'encrypted_pfx', type: 'bytea' })
  encryptedPfx!: Buffer;

  @Column({ name: 'encrypted_password', type: 'bytea' })
  encryptedPassword!: Buffer;

  @Column({ name: 'pfx_iv', type: 'varchar', length: 32 })
  pfxIv!: string;

  @Column({ name: 'password_iv', type: 'varchar', length: 32 })
  passwordIv!: string;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt!: Date;
}
