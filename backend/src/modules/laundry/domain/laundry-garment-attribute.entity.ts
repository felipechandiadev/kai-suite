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
import { LaundryGarmentAttributeValue } from './laundry-garment-attribute-value.entity';

@Entity('laundry_garment_attributes')
@Index('UQ_laundry_garment_attributes_company_code', ['companyId', 'code'], {
  unique: true,
})
export class LaundryGarmentAttribute {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_laundry_garment_attributes_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => LaundryGarmentAttributeValue, (v) => v.attribute, {
    cascade: true,
  })
  values?: LaundryGarmentAttributeValue[];
}
