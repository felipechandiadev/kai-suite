import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '@modules/companies/domain/company.entity';

export enum VoucherFaceValueMode {
  FIXED = 'FIXED',
  OPEN = 'OPEN',
}

@Entity('company_voucher_kinds')
@Index('idx_company_voucher_kinds_company', ['companyId'])
export class CompanyVoucherKindEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  /** Código auto inmutable (VK00001). */
  @Column({ type: 'varchar', length: 32 })
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({
    name: 'face_value_mode',
    type: 'varchar',
    length: 16,
    default: VoucherFaceValueMode.OPEN,
  })
  faceValueMode!: VoucherFaceValueMode;

  @Column({
    name: 'default_face_value',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  defaultFaceValue?: string | null;

  /**
   * Solo relevante si `faceValueMode === OPEN`: exige faceValue en la venta.
   * Legacy de `requireFaceValue` en settings JSON.
   */
  @Column({ name: 'require_face_value', type: 'boolean', default: false })
  requireFaceValue!: boolean;

  @Column({ name: 'default_issuer_name', type: 'varchar', length: 255, nullable: true })
  defaultIssuerName?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date | null;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company?: Company;
}
