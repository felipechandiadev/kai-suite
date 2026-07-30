import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { LaundryReception } from './laundry-reception.entity';
import { LaundryReceptionGarment } from './laundry-reception-garment.entity';

@Entity('laundry_reception_service_lines')
export class LaundryReceptionServiceLine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_laundry_reception_service_lines_reception_id')
  @Column({ name: 'reception_id', type: 'uuid' })
  receptionId!: string;

  @Index('idx_laundry_reception_service_lines_garment_id')
  @Column({ name: 'garment_id', type: 'uuid' })
  garmentId!: string;

  @Column({ name: 'product_variant_id', type: 'uuid' })
  productVariantId!: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  quantity!: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 18, scale: 4, default: 0 })
  unitPrice!: number;

  @Column({ name: 'line_total', type: 'decimal', precision: 18, scale: 4, default: 0 })
  lineTotal!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => LaundryReception, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reception_id' })
  reception?: LaundryReception;

  @ManyToOne(() => LaundryReceptionGarment, (g) => g.serviceLines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'garment_id' })
  garment?: LaundryReceptionGarment;
}
