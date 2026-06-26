import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PresaleTicket } from './presale-ticket.entity';

@Entity('presale_ticket_lines')
export class PresaleTicketLine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_presale_ticket_lines_ticket')
  @Column({ name: 'presale_ticket_id', type: 'uuid' })
  presaleTicketId!: string;

  @Column({ name: 'line_number', type: 'int' })
  lineNumber!: number;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId?: string | null;

  @Column({ name: 'product_variant_id', type: 'uuid', nullable: true })
  productVariantId?: string | null;

  @Column({ name: 'product_name', type: 'varchar', length: 255 })
  productName!: string;

  @Column({ name: 'product_sku', type: 'varchar', length: 128, nullable: true })
  productSku?: string | null;

  @Column({ name: 'variant_name', type: 'varchar', length: 255, nullable: true })
  variantName?: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  quantity!: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 18, scale: 4, default: 0 })
  unitPrice!: number;

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
  })
  discountAmount!: number;

  @Column({ name: 'tax_rate', type: 'decimal', precision: 8, scale: 4, default: 0 })
  taxRate!: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 18, scale: 4, default: 0 })
  taxAmount!: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  total!: number;

  @Column({ name: 'unit_of_measure', type: 'varchar', length: 32, nullable: true })
  unitOfMeasure?: string | null;

  @Column({ name: 'promotion_snapshot', type: 'jsonb', nullable: true })
  promotionSnapshot?: Record<string, unknown> | null;

  @ManyToOne(() => PresaleTicket, (ticket) => ticket.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'presale_ticket_id' })
  ticket?: PresaleTicket;
}
