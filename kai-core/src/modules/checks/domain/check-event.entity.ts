import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Check, CheckStatus } from './check.entity';

/**
 * Auditoría liviana de transiciones de estado del cheque. Cada cambio
 * de status (deposit/clear/bounce/void/endorse) deja una fila aquí con
 * el usuario que lo ejecutó y notas opcionales.
 */
@Entity('check_events')
@Index('idx_check_events_check', ['checkId'])
export class CheckEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  checkId!: string;

  @Column({ type: 'enum', enum: CheckStatus, nullable: true })
  fromStatus?: CheckStatus | null;

  @Column({ type: 'enum', enum: CheckStatus })
  toStatus!: CheckStatus;

  @Column({ type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @CreateDateColumn({ name: 'at' })
  at!: Date;

  @ManyToOne(() => Check, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'checkId' })
  check?: Check;
}
