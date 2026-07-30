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
import { PresaleTicketLine } from './presale-ticket-line.entity';

export enum PresaleTicketStatus {
  READY = 'READY',
  REDEEMED = 'REDEEMED',
  CANCELLED = 'CANCELLED',
}

@Entity('presale_tickets')
@Index('UQ_presale_tickets_company_code', ['companyId', 'code'], {
  unique: true,
})
export class PresaleTicket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_presale_tickets_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 32 })
  code!: string;

  @Column({
    type: 'enum',
    enum: PresaleTicketStatus,
    default: PresaleTicketStatus.READY,
  })
  status!: PresaleTicketStatus;

  @Column({ name: 'presale_point_of_sale_id', type: 'uuid' })
  presalePointOfSaleId!: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @Column({ name: 'price_list_id', type: 'uuid' })
  priceListId!: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId?: string | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 255, nullable: true })
  customerName?: string | null;

  @Column({
    name: 'customer_document',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  customerDocument?: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  subtotal!: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 18, scale: 4, default: 0 })
  taxAmount!: number;

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
  })
  discountAmount!: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  total!: number;

  @Column({ name: 'promotions_snapshot', type: 'jsonb', nullable: true })
  promotionsSnapshot?: Record<string, unknown>[] | null;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string | null;

  @Column({ name: 'redeemed_at', type: 'timestamptz', nullable: true })
  redeemedAt?: Date | null;

  @Column({ name: 'redeemed_transaction_id', type: 'uuid', nullable: true })
  redeemedTransactionId?: string | null;

  @Column({ name: 'redeemed_point_of_sale_id', type: 'uuid', nullable: true })
  redeemedPointOfSaleId?: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt?: Date | null;

  @Column({ name: 'cancelled_by_user_id', type: 'uuid', nullable: true })
  cancelledByUserId?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => PresaleTicketLine, (line) => line.ticket, {
    cascade: true,
  })
  lines?: PresaleTicketLine[];
}
