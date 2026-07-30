import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum PosSyncCommandStatus {
  PENDING = 'PENDING',
  SYNCED = 'SYNCED',
  FAILED = 'FAILED',
  CONFLICT = 'CONFLICT',
}

@Entity('pos_sync_commands')
@Index('uq_pos_sync_client_operation', ['companyId', 'clientOperationId'], {
  unique: true,
})
export class PosSyncCommand {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'client_operation_id', type: 'varchar', length: 128 })
  clientOperationId!: string;

  @Column({ name: 'device_id', type: 'varchar', length: 64 })
  deviceId!: string;

  @Column({ name: 'command_type', type: 'varchar', length: 32 })
  commandType!: string;

  @Column({ name: 'cash_session_id', type: 'uuid', nullable: true })
  cashSessionId?: string | null;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  transactionId?: string | null;

  @Column({ type: 'varchar', length: 32, default: PosSyncCommandStatus.PENDING })
  status!: PosSyncCommandStatus;

  @Column({ name: 'response_json', type: 'jsonb', nullable: true })
  responseJson?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
