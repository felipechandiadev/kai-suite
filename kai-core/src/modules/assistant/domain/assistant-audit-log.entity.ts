import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('assistant_audit_log')
@Index('idx_assistant_audit_company', ['companyId', 'createdAt'])
export class AssistantAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'conversation_id', type: 'uuid', nullable: true })
  conversationId?: string | null;

  @Column({ name: 'tool_name', type: 'varchar', length: 80, nullable: true })
  toolName?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  params?: Record<string, unknown> | null;

  @Column({ name: 'row_count', type: 'int', nullable: true })
  rowCount?: number | null;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs?: number | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  feedback?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
