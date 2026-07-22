import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';
import { DiningOrder } from './dining-order.entity';
import { DiningStationOrder } from './dining-station-order.entity';
import { KitchenItemStatus, LineSource } from './dining.enums';

@Entity('dining_order_lines')
@Index('idx_dining_order_lines_order_id', ['diningOrderId'])
@Index('idx_dining_order_lines_station_order', ['stationOrderId'])
@Index('idx_dining_order_lines_kitchen_queue', ['productionUnitId', 'kitchenStatus'])
@Index('idx_dining_order_lines_kitchen_fire', [
  'productionUnitId',
  'kitchenFireId',
  'kitchenStatus',
])
export class DiningOrderLine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'dining_order_id', type: 'uuid' })
  diningOrderId!: string;

  /** Pedido de estación (fire); null = borrador o legacy. */
  @Column({ name: 'station_order_id', type: 'uuid', nullable: true })
  stationOrderId?: string | null;

  @Column({ name: 'product_variant_id', type: 'uuid' })
  productVariantId!: string;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 1 })
  quantity!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'production_unit_id', type: 'uuid', nullable: true })
  productionUnitId?: string | null;

  /** UUID de la tanda (fire) al enviar a cocina; null = legacy. */
  @Column({ name: 'kitchen_fire_id', type: 'uuid', nullable: true })
  kitchenFireId?: string | null;

  /** Correlativo diario de pedido en la sucursal (mismo día operativo que cuentas). */
  @Column({ name: 'kitchen_fire_number', type: 'int', nullable: true })
  kitchenFireNumber?: number | null;

  @Column({
    name: 'kitchen_status',
    type: 'enum',
    enum: KitchenItemStatus,
    enumName: 'kitchen_item_status_enum',
    default: KitchenItemStatus.DRAFT,
  })
  kitchenStatus!: KitchenItemStatus;

  @Column({ name: 'line_source', type: 'enum', enum: LineSource, enumName: 'line_source_enum' })
  lineSource!: LineSource;

  @Column({ name: 'sent_to_kitchen_at', type: 'timestamptz', nullable: true })
  sentToKitchenAt?: Date | null;

  /** Tx `INVENTORY_RESERVATION` de insumos al fire (CTP política B). */
  @Column({ name: 'material_reservation_transaction_id', type: 'uuid', nullable: true })
  materialReservationTransactionId?: string | null;

  @Column({ name: 'materials_reserved_at', type: 'timestamptz', nullable: true })
  materialsReservedAt?: Date | null;

  @Column({ name: 'ready_at', type: 'timestamptz', nullable: true })
  readyAt?: Date | null;

  @Column({ name: 'served_at', type: 'timestamptz', nullable: true })
  servedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => DiningOrder, (order) => order.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dining_order_id' })
  diningOrder?: DiningOrder;

  @ManyToOne(() => DiningStationOrder, (so) => so.lines, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'station_order_id' })
  stationOrder?: DiningStationOrder | null;

  @ManyToOne(() => ProductVariant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_variant_id' })
  productVariant?: ProductVariant;

  @ManyToOne(() => ProductionUnit, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'production_unit_id' })
  productionUnit?: ProductionUnit | null;
}
