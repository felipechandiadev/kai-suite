import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NotificationDeliveryStatus } from './notification.enums';
import { Notification } from './notification.entity';

@Entity('notification_deliveries')
@Index('idx_notification_deliveries_inbox', [
  'userId',
  'companyId',
  'status',
  'deliveredAt',
])
export class NotificationDelivery {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'notification_id', type: 'uuid' })
  notificationId!: string;

  @ManyToOne(() => Notification, (n) => n.deliveries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notification_id' })
  notification?: Notification;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({
    type: 'enum',
    enum: NotificationDeliveryStatus,
    default: NotificationDeliveryStatus.UNREAD,
  })
  status!: NotificationDeliveryStatus;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @Column({ name: 'dismissed_at', type: 'timestamptz', nullable: true })
  dismissedAt!: Date | null;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  @Column({ name: 'snoozed_until', type: 'timestamptz', nullable: true })
  snoozedUntil!: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz' })
  deliveredAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
