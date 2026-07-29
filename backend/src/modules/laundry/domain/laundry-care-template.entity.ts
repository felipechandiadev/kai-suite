import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('laundry_care_templates')
export class LaundryCareTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_laundry_care_templates_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 255 })
  label!: string;

  @Column({ type: 'text' })
  text!: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
