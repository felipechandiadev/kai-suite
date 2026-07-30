import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Person } from '@modules/persons/domain/person.entity';

export enum SupplierType {
  MANUFACTURER = 'MANUFACTURER',
  DISTRIBUTOR = 'DISTRIBUTOR',
  WHOLESALER = 'WHOLESALER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  CONTRACTOR = 'CONTRACTOR',
  LOGISTICS = 'LOGISTICS',
  IMPORTER = 'IMPORTER',
}

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_suppliers_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  personId!: string;

  @Column({ type: 'enum', enum: SupplierType, default: SupplierType.DISTRIBUTOR })
  supplierType!: SupplierType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  alias?: string;

  @Column({ type: 'int', default: 0 })
  defaultPaymentTermDays!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Relations
  @ManyToOne(() => Person, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'personId' })
  person?: Person;

  // Note: Transaction has ManyToOne to Supplier
  // We don't define inverse OneToMany here to avoid circular metadata issues
}
