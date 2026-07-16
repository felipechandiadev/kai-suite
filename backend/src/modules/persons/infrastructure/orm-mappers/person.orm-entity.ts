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

export enum PersonType {
  NATURAL = 'NATURAL',
  COMPANY = 'COMPANY',
}

export enum DocumentType {
  RUN = 'RUN',
  RUT = 'RUT',
  PASSPORT = 'PASSPORT',
  DNI = 'DNI',
}

export interface PersonBankAccount {
  accountKey?: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  accountHolderName?: string;
  isPrimary?: boolean;
  notes?: string;
  currentBalance?: number;
}

@Entity('persons')
export class PersonOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32, default: PersonType.NATURAL })
  type!: PersonType;

  @Column({ type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  businessName?: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  documentType?: DocumentType | null;

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  documentNumber?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 8, nullable: true })
  regionCode?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  regionName?: string | null;

  @Column({ type: 'varchar', length: 8, nullable: true })
  communeCode?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  communeName?: string | null;

  @Column({ type: 'varchar', length: 8, nullable: true })
  treasuryCode?: string | null;

  @Column({ type: 'json', nullable: true })
  economicActivities?: Array<{
    code: string;
    name: string;
    category: 'PRIMERA' | 'SEGUNDA';
    ivaAffected: boolean;
    isActive: boolean;
  }> | null;

  @Column({ type: 'json', nullable: true })
  bankAccounts?: PersonBankAccount[] | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
