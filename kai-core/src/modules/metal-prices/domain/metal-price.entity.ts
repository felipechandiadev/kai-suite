import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { MetalType } from '@modules/metal-prices/domain/metal.enum';

/**
 * Entity for registering historical metal prices (gold, silver, platinum, etc).
 */
@Entity('metal_prices')
export class MetalPrice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_metal_prices_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'Oro 18K',
  })
  metal!: string;

  @Column({ type: 'timestamp' })
  date!: Date;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  valueCLP!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
