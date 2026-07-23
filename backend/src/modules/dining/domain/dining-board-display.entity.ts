import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Branch } from '@modules/branches/domain/branch.entity';

/**
 * Pantalla pública Kai Board (monitor de estado de pedidos).
 * Auth por display token (hasheado); sin login de usuario.
 */
@Entity('dining_board_displays')
@Index('idx_dining_board_displays_company_id', ['companyId'])
@Index('idx_dining_board_displays_branch_id', ['branchId'])
@Index('uq_dining_board_displays_token_hash', ['tokenHash'], { unique: true })
export class DiningBoardDisplay {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  /** SHA-256 hex del código de 6 dígitos (nunca se persiste en claro). */
  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt?: Date | null;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;
}
