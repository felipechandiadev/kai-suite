import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { LaundryReceptionStatus } from './laundry-reception-status.enum';
import { LaundryPaymentMode } from './laundry-payment-mode.enum';
import { LaundryReceptionGarment } from './laundry-reception-garment.entity';

@Entity('laundry_receptions')
@Index('UQ_laundry_receptions_branch_code', ['branchId', 'code'], {
  unique: true,
})
export class LaundryReception {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_laundry_receptions_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Index('idx_laundry_receptions_branch_id')
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @Column({ name: 'point_of_sale_id', type: 'uuid', nullable: true })
  pointOfSaleId?: string | null;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  code?: string | null;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column({ name: 'customer_name_snapshot', type: 'varchar', length: 255 })
  customerNameSnapshot!: string;

  @Column({
    name: 'customer_phone_snapshot',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  customerPhoneSnapshot?: string | null;

  @Column({
    type: 'varchar',
    length: 32,
    default: LaundryReceptionStatus.DRAFT,
  })
  status!: LaundryReceptionStatus;

  @Column({
    name: 'payment_mode',
    type: 'varchar',
    length: 32,
    default: LaundryPaymentMode.FULL_ON_PICKUP,
  })
  paymentMode!: LaundryPaymentMode;

  @Column({
    name: 'deposit_amount',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
  })
  depositAmount!: number;

  @Column({
    name: 'paid_amount',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
  })
  paidAmount!: number;

  @Column({
    name: 'balance_due',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
  })
  balanceDue!: number;

  @Column({
    name: 'services_total',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
  })
  servicesTotal!: number;

  @Column({ name: 'received_at', type: 'timestamptz', nullable: true })
  receivedAt?: Date | null;

  @Column({ name: 'promised_at', type: 'timestamptz', nullable: true })
  promisedAt?: Date | null;

  @Column({ name: 'ready_at', type: 'timestamptz', nullable: true })
  readyAt?: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'sale_transaction_id', type: 'uuid', nullable: true })
  saleTransactionId?: string | null;

  @Column({ name: 'deposit_transaction_id', type: 'uuid', nullable: true })
  depositTransactionId?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => LaundryReceptionGarment, (g) => g.reception, {
    cascade: true,
  })
  garments?: LaundryReceptionGarment[];
}
