import 'reflect-metadata';
import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { DiningOrderKind } from './dining.enums';

/**
 * Contador atómico por sucursal + kind + día operativo (period_key).
 */
@Entity('dining_order_sequences')
@Unique('uq_dining_order_sequences_scope', ['branchId', 'kind', 'periodKey'])
@Index('idx_dining_order_sequences_company_id', ['companyId'])
export class DiningOrderSequence {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @Column({ type: 'enum', enum: DiningOrderKind, enumName: 'dining_order_kind_enum' })
  kind!: DiningOrderKind;

  /** Día operativo YYYY-MM-DD según timezone + resetTimeLocal. */
  @Column({ name: 'period_key', type: 'varchar', length: 10 })
  periodKey!: string;

  @Column({ name: 'last_number', type: 'int', default: 0 })
  lastNumber!: number;
}
