import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { PersonBankAccount } from '@modules/persons/domain/person.entity';

export type CompanyBankAccount = PersonBankAccount;

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'razon_social', type: 'varchar', length: 255 })
  razonSocial!: string;

  @Column({ name: 'nombre_fantasia', type: 'varchar', length: 255, nullable: true })
  nombreFantasia?: string | null;

  @Column({ name: 'business_activity', type: 'varchar', length: 255, nullable: true })
  businessActivity?: string | null;

  /** Formato chileno único: xx.xxx.xxx-d */
  @Column({ name: 'rut', type: 'varchar', length: 14, unique: true })
  rut!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  commune?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  city?: string | null;

  @Column({ name: 'sii_resolution_number', type: 'varchar', length: 64, nullable: true })
  siiResolutionNumber?: string | null;

  @Column({ name: 'sii_resolution_date', type: 'date', nullable: true })
  siiResolutionDate?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mail?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone?: string | null;

  @Column({ type: 'varchar', length: 10, default: 'CLP' })
  defaultCurrency!: string;

  @Column({ type: 'date', nullable: true })
  fiscalYearStart?: Date;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'json', nullable: true })
  settings?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  bankAccounts?: CompanyBankAccount[] | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Note: Branches and Taxes are queried by companyId
  // No inverse relations to avoid circular dependency issues
}
