import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export enum TaxType {
  IVA = 'IVA',
  EXEMPT = 'EXEMPT',
  RETENTION = 'RETENTION',
  SPECIFIC = 'SPECIFIC',
}

@Entity('taxes')
export class Tax {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  code!: string | null;

  @Column({ type: 'enum', enum: TaxType, default: TaxType.IVA })
  taxType!: TaxType;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  rate!: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /** When true, the tax cannot be removed (soft-delete blocked). */
  @Column({ type: 'boolean', default: false })
  nonDeletable!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Note: Tax is referenced by Product.taxIds and ProductVariant.taxIds as JSON arrays
  // No direct relation needed - queries use the taxIds JSON field
}
