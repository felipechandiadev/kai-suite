import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DiningOrder } from './dining-order.entity';
import { DiningOrderLine } from './dining-order-line.entity';
import { DiningStationOrderStatus } from './dining.enums';

/**
 * Pedido de estación (fire): una tanda al enviar ítems a unidad(es) de producción.
 * El id coincide con kitchenFireId en las líneas (espejo temporal).
 */
@Entity('dining_station_orders')
@Index('idx_dining_station_orders_branch_period', ['branchId', 'periodKey'])
@Index('idx_dining_station_orders_dining_order', ['diningOrderId'])
@Index('idx_dining_station_orders_company_id', ['companyId'])
export class DiningStationOrder {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @Column({ name: 'dining_order_id', type: 'uuid' })
  diningOrderId!: string;

  /** Día operativo YYYY-MM-DD (timezone + resetTimeLocal). */
  @Column({ name: 'period_key', type: 'varchar', length: 10 })
  periodKey!: string;

  @Column({ name: 'sequence_number', type: 'int' })
  sequenceNumber!: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: DiningStationOrderStatus,
    enumName: 'dining_station_order_status_enum',
    default: DiningStationOrderStatus.OPEN,
  })
  status!: DiningStationOrderStatus;

  @Column({ name: 'sent_at', type: 'timestamptz' })
  sentAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => DiningOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dining_order_id' })
  diningOrder?: DiningOrder;

  @OneToMany(() => DiningOrderLine, (line) => line.stationOrder)
  lines?: DiningOrderLine[];
}
