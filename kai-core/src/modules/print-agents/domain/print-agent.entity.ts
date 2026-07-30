import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PrintAgentPlatform = 'desktop' | 'android' | 'unknown';

/**
 * Agente Kai Printers registrado en Core (catálogo/presencia).
 * La impresión real sigue por WebSocket LAN; Core no retransmite jobs.
 */
@Entity('print_agents')
@Index('idx_print_agents_company_id', ['companyId'])
@Index('idx_print_agents_branch_id', ['branchId'])
@Index('uq_print_agents_token_hash', ['tokenHash'], { unique: true })
export class PrintAgent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId?: string | null;

  @Column({ name: 'display_name', type: 'varchar', length: 120 })
  displayName!: string;

  /** SHA-256 hex del token de agente (nunca en claro). */
  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash!: string;

  @Column({ name: 'lan_host', type: 'varchar', length: 255, nullable: true })
  lanHost?: string | null;

  @Column({ name: 'ws_port', type: 'int', nullable: true })
  wsPort?: number | null;

  @Column({ name: 'wss_port', type: 'int', nullable: true })
  wssPort?: number | null;

  @Column({ name: 'use_tls', type: 'boolean', default: false })
  useTls!: boolean;

  @Column({ type: 'varchar', length: 20, default: 'unknown' })
  platform!: PrintAgentPlatform;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt?: Date | null;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt?: Date | null;

  @Column({ name: 'paired_at', type: 'timestamptz', nullable: true })
  pairedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
