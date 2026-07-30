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

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_customers_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  personId!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  creditLimit!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  currentBalance!: number;

  @Column({
    type: 'enum',
    enum: [5, 10, 15, 20, 25, 30],
    default: 5,
    comment: 'Día de pago del mes para programar pagos automáticos',
  })
  paymentDayOfMonth!: 5 | 10 | 15 | 20 | 25 | 30;

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

  // Note: Transaction has ManyToOne to Customer
  // We don't define inverse OneToMany here to avoid circular metadata issues
}
