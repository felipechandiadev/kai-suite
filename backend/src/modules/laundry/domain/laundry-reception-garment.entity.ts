import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { LaundryReception } from './laundry-reception.entity';
import { LaundryReceptionServiceLine } from './laundry-reception-service-line.entity';

export type LaundryGarmentAttributeValueSnapshot = {
  attributeId: string;
  attributeCode?: string;
  valueId: string;
  label?: string;
};

@Entity('laundry_reception_garments')
export class LaundryReceptionGarment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_laundry_reception_garments_reception_id')
  @Column({ name: 'reception_id', type: 'uuid' })
  receptionId!: string;

  @Column({ name: 'garment_type_id', type: 'uuid' })
  garmentTypeId!: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 1 })
  quantity!: number;

  @Column({ name: 'attribute_values', type: 'jsonb', default: [] })
  attributeValues!: LaundryGarmentAttributeValueSnapshot[];

  @Column({ name: 'care_instructions', type: 'text', nullable: true })
  careInstructions?: string | null;

  @Column({ name: 'customer_notes', type: 'text', nullable: true })
  customerNotes?: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => LaundryReception, (r) => r.garments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reception_id' })
  reception?: LaundryReception;

  @OneToMany(() => LaundryReceptionServiceLine, (l) => l.garment, {
    cascade: true,
  })
  serviceLines?: LaundryReceptionServiceLine[];
}
