import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '@modules/companies/domain/company.entity';
import { PaymentMethod } from '@modules/transactions/domain/transaction.entity';
import { CompanyVoucherKindEntity } from './company-voucher-kind.entity';

@Entity('company_payment_methods')
@Index('idx_company_payment_methods_company', ['companyId'])
export class CompanyPaymentMethodEntity {
  /** UUID estable (puede venir del JSON legacy / default catalog). */
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 40 })
  method!: PaymentMethod;

  @Column({ type: 'varchar', length: 255, nullable: true })
  alias?: string | null;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'require_reference', type: 'boolean', default: false })
  requireReference!: boolean;

  @Column({ name: 'bank_account_key', type: 'varchar', length: 120, nullable: true })
  bankAccountKey?: string | null;

  /** Comisión de adquirente (%). Solo aplica a CREDIT_CARD / DEBIT_CARD. */
  @Column({
    name: 'fee_percent',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: {
      to: (v?: number | null) => v,
      from: (v: string | number | null) =>
        v == null || v === '' ? null : Number(v),
    },
  })
  feePercent?: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  /** Obligatorio cuando method = VOUCHER. */
  @Column({ name: 'voucher_kind_id', type: 'uuid', nullable: true })
  voucherKindId?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date | null;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company?: Company;

  @ManyToOne(() => CompanyVoucherKindEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'voucher_kind_id' })
  voucherKind?: CompanyVoucherKindEntity | null;
}
