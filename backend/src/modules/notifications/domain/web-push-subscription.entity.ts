import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type WebPushClientApp = 'pos' | 'kds';

@Entity('web_push_subscriptions')
@Index('idx_web_push_subs_user_company', ['userId', 'companyId'])
@Index('idx_web_push_subs_company_client', ['companyId', 'clientApp'])
export class WebPushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'client_app', type: 'varchar', length: 16 })
  clientApp!: WebPushClientApp;

  @Index({ unique: true })
  @Column({ type: 'text' })
  endpoint!: string;

  @Column({ type: 'text' })
  p256dh!: string;

  @Column({ type: 'text' })
  auth!: string;

  @Column({ name: 'production_unit_id', type: 'uuid', nullable: true })
  productionUnitId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
