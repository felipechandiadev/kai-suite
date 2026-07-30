import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Branch } from '@modules/branches/domain/branch.entity';
import { DiningRoom } from './dining-room.entity';
import { DiningTable } from './dining-table.entity';
import { DiningOrderKind, DiningOrderStatus } from './dining.enums';
import { DiningOrderLine } from './dining-order-line.entity';

export interface DiningOrderProfile {
  adultCount?: number;
  childCount?: number;
  notes?: string;
  /** Nombre para llamar al cliente; por defecto igual a displayLabel. */
  customerName?: string;
}

@Entity('dining_orders')
@Index('idx_dining_orders_company_id', ['companyId'])
@Index('idx_dining_orders_branch_status', ['branchId', 'status'])
@Index('idx_dining_orders_branch_kind', ['branchId', 'kind'])
@Index('idx_dining_orders_table_id', ['diningTableId'])
export class DiningOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @Column({ type: 'enum', enum: DiningOrderKind, enumName: 'dining_order_kind_enum' })
  kind!: DiningOrderKind;

  @Column({ name: 'dining_table_id', type: 'uuid', nullable: true })
  diningTableId?: string | null;

  @Column({ name: 'display_label', type: 'varchar', length: 255 })
  displayLabel!: string;

  /** Correlativo del día operativo (barra / para llevar). */
  @Column({ name: 'sequence_number', type: 'int', nullable: true })
  sequenceNumber?: number | null;

  @Column({ name: 'sequence_period_key', type: 'varchar', length: 10, nullable: true })
  sequencePeriodKey?: string | null;

  @Column({ name: 'dining_room_id', type: 'uuid', nullable: true })
  diningRoomId?: string | null;

  @Column({ name: 'opened_by_user_id', type: 'uuid', nullable: true })
  openedByUserId?: string | null;

  @Column({
    type: 'enum',
    enum: DiningOrderStatus,
    enumName: 'dining_order_status_enum',
    default: DiningOrderStatus.OPEN,
  })
  status!: DiningOrderStatus;

  @Column({ type: 'jsonb', nullable: true })
  profile?: DiningOrderProfile | null;

  @Column({ name: 'opened_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  openedAt!: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt?: Date | null;

  @Column({ name: 'sale_draft_id', type: 'uuid', nullable: true })
  saleDraftId?: string | null;

  @Column({ name: 'linked_transaction_id', type: 'uuid', nullable: true })
  linkedTransactionId?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @ManyToOne(() => DiningRoom, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'dining_room_id' })
  diningRoom?: DiningRoom | null;

  @ManyToOne(() => DiningTable, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'dining_table_id' })
  diningTable?: DiningTable | null;

  @OneToMany(() => DiningOrderLine, (line) => line.diningOrder)
  lines?: DiningOrderLine[];
}
