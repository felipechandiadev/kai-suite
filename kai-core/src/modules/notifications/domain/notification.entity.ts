import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  NotificationDomain,
  NotificationSeverity,
  NotificationSource,
} from './notification.enums';
import { NotificationDelivery } from './notification-delivery.entity';
import { NotificationAudience } from './notification-audience.entity';

@Entity('notifications')
@Index('idx_notifications_company_created', ['companyId', 'createdAt'])
@Index('idx_notifications_company_domain_kind', ['companyId', 'domain', 'kind'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({
    type: 'enum',
    enum: NotificationSource,
    default: NotificationSource.AUTOMATION,
  })
  source!: NotificationSource;

  @Column({
    type: 'enum',
    enum: NotificationDomain,
  })
  domain!: NotificationDomain;

  @Column({ type: 'varchar', length: 128 })
  kind!: string;

  @Column({
    type: 'enum',
    enum: NotificationSeverity,
    default: NotificationSeverity.INFO,
  })
  severity!: NotificationSeverity;

  @Column({ type: 'varchar', length: 512 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  body!: string | null;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @Column({ name: 'entity_type', type: 'varchar', length: 64, nullable: true })
  entityType!: string | null;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId!: string | null;

  @Index('idx_notifications_group_key_created')
  @Column({ name: 'group_key', type: 'varchar', length: 256, nullable: true })
  groupKey!: string | null;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId!: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => NotificationDelivery, (d) => d.notification)
  deliveries?: NotificationDelivery[];

  @OneToMany(() => NotificationAudience, (a) => a.notification)
  audiences?: NotificationAudience[];
}
