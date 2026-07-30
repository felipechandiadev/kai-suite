// Tax ORM entity mapper (detailed definition below)
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
export class TaxOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  code!: string | null;

  @Column({ type: 'varchar', length: 50, default: TaxType.IVA })
  taxType!: TaxType;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  rate!: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  nonDeletable!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
