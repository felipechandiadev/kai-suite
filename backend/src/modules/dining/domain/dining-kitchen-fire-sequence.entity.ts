import 'reflect-metadata';
import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * Contador atómico de pedidos de cocina por sucursal + día operativo (period_key).
 */
@Entity('dining_kitchen_fire_sequences')
@Unique('uq_dining_kitchen_fire_sequences_scope', ['branchId', 'periodKey'])
@Index('idx_dining_kitchen_fire_sequences_company_id', ['companyId'])
export class DiningKitchenFireSequence {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  /** Día operativo YYYY-MM-DD según timezone + resetTimeLocal. */
  @Column({ name: 'period_key', type: 'varchar', length: 10 })
  periodKey!: string;

  @Column({ name: 'last_number', type: 'int', default: 0 })
  lastNumber!: number;
}
