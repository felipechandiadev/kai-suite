import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { MetalType } from '@modules/metal-prices/domain/metal.enum';

/**
 * ORM Entity for historical metal prices.
 */
@Entity('metal_prices')
export class MetalPriceOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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
