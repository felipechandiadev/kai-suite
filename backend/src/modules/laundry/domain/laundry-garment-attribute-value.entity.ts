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
import { LaundryGarmentAttribute } from './laundry-garment-attribute.entity';

@Entity('laundry_garment_attribute_values')
export class LaundryGarmentAttributeValue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_laundry_garment_attribute_values_attribute_id')
  @Column({ name: 'attribute_id', type: 'uuid' })
  attributeId!: string;

  @Column({ type: 'varchar', length: 255 })
  label!: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => LaundryGarmentAttribute, (a) => a.values, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'attribute_id' })
  attribute?: LaundryGarmentAttribute;
}
