import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PersonOrmEntity } from '@modules/persons/infrastructure/orm-mappers/person.orm-entity';

@Entity('customers')
export class CustomerOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  personId!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  creditLimit!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  currentBalance!: number;

  @Column({
    type: 'int',
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

  @ManyToOne(() => PersonOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'personId' })
  person?: PersonOrmEntity;
}
