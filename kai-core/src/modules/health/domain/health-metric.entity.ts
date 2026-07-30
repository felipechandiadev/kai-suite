import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Represents application health status metrics
 */
@Entity('health_metrics')
export class HealthMetric {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  service!: string;

  @Column({ type: 'varchar', length: 50 })
  status!: 'UP' | 'DOWN' | 'DEGRADED';

  @Column({ type: 'int', default: 0 })
  responseTime!: number;

  @Column({ type: 'text', nullable: true })
  details?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
