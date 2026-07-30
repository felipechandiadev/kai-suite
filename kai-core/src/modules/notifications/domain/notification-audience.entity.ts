import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationAudienceType } from './notification.enums';
import { Notification } from './notification.entity';

@Entity('notification_audiences')
@Index('idx_notification_audiences_notification', ['notificationId'])
export class NotificationAudience {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'notification_id', type: 'uuid' })
  notificationId!: string;

  @ManyToOne(() => Notification, (n) => n.audiences, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notification_id' })
  notification?: Notification;

  @Column({
    name: 'audience_type',
    type: 'enum',
    enum: NotificationAudienceType,
  })
  audienceType!: NotificationAudienceType;

  @Column({ name: 'audience_config', type: 'jsonb', default: {} })
  audienceConfig!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
