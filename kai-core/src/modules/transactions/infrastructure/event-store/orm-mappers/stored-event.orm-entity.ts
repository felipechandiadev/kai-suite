import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('stored_events')
@Index(['aggregateId', 'aggregateType'])
@Index(['eventType'])
@Index(['occurredOn'])
export class StoredEventOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  aggregateId: string;

  @Column({ type: 'varchar', length: 100 })
  aggregateType: string;

  @Column({ type: 'varchar', length: 100 })
  eventType: string;

  @Column({ type: 'jsonb' })
  eventData: any;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @CreateDateColumn()
  @Index()
  occurredOn: Date;

  @Column({ type: 'int', default: 0 })
  version: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  correlationId?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  causationId?: string;
}
