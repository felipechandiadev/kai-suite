import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NotificationDomain } from './notification.enums';

@Entity('notification_retention_policies')
export class NotificationRetentionPolicy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId!: string | null;

  @Column({
    type: 'enum',
    enum: NotificationDomain,
  })
  domain!: NotificationDomain;

  @Column({ name: 'delivery_read_purge_days', type: 'int', default: 60 })
  deliveryReadPurgeDays!: number;

  @Column({ name: 'delivery_unread_dismiss_days', type: 'int', default: 90 })
  deliveryUnreadDismissDays!: number;

  @Column({ name: 'notification_orphan_purge_days', type: 'int', default: 180 })
  notificationOrphanPurgeDays!: number;

  @Column({ name: 'dedup_window_minutes', type: 'int', default: 15 })
  dedupWindowMinutes!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
