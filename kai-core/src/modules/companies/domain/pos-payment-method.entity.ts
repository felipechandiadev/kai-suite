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
  UpdateDateColumn,
} from 'typeorm';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { CompanyPaymentMethodEntity } from '@modules/companies/domain/company-payment-method.entity';

@Entity('pos_payment_methods')
@Unique('UQ_pos_payment_methods_pos_cmp', ['pointOfSaleId', 'companyPaymentMethodId'])
@Index('idx_pos_payment_methods_pos', ['pointOfSaleId'])
export class PosPaymentMethodEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'point_of_sale_id', type: 'uuid' })
  pointOfSaleId!: string;

  @Column({ name: 'company_payment_method_id', type: 'uuid' })
  companyPaymentMethodId!: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled!: boolean;

  @Column({ name: 'preload_on_payment_screen', type: 'boolean', default: false })
  preloadOnPaymentScreen!: boolean;

  @Column({ name: 'preload_order', type: 'int', nullable: true })
  preloadOrder?: number | null;

  @Column({ name: 'is_default_for_change', type: 'boolean', default: false })
  isDefaultForChange!: boolean;

  @Column({ name: 'bank_account_key', type: 'varchar', length: 120, nullable: true })
  bankAccountKey?: string | null;

  /** null = heredar del medio de empresa. */
  @Column({ name: 'require_reference', type: 'boolean', nullable: true })
  requireReference?: boolean | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => PointOfSale, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'point_of_sale_id' })
  pointOfSale?: PointOfSale;

  @ManyToOne(() => CompanyPaymentMethodEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_payment_method_id' })
  companyPaymentMethod?: CompanyPaymentMethodEntity;
}
