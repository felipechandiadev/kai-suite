import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NotificationDomain, NotificationSeverity } from './notification.enums';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({
    type: 'enum',
    enum: NotificationDomain,
  })
  domain!: NotificationDomain;

  @Column({ type: 'varchar', length: 128, nullable: true })
  kind!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'IN_APP' })
  channel!: string;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({
    name: 'min_severity',
    type: 'enum',
    enum: NotificationSeverity,
    nullable: true,
  })
  minSeverity!: NotificationSeverity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
