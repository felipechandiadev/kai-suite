import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('delivery_order_line_picks')
@Index('uq_delivery_order_line_picks', ['companyId', 'deliveryOrderId', 'transactionLineId'], {
  unique: true,
})
@Index('idx_delivery_order_line_picks_order', ['companyId', 'deliveryOrderId'])
export class EShopDeliveryOrderLinePick {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'delivery_order_id', type: 'uuid' })
  deliveryOrderId!: string;

  @Column({ name: 'transaction_line_id', type: 'uuid' })
  transactionLineId!: string;

  @Column({ name: 'is_picked', type: 'boolean', default: false })
  isPicked!: boolean;

  @Column({ name: 'picked_at', type: 'timestamptz', nullable: true })
  pickedAt!: Date | null;

  @Column({ name: 'picked_by_user_id', type: 'uuid', nullable: true })
  pickedByUserId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
