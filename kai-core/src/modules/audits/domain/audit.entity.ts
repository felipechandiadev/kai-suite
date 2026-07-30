import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '@modules/users/domain/user.entity';
import { AuditActionType } from '@modules/audits/domain/audit.types';

@Entity('audits')
export class Audit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  entityName!: string; // 'User' | 'Person' | 'Auth'

  @Column('varchar', { length: 255 })
  entityId!: string; // UUID o identificador custom (ej: userName para login)

  @Column({ name: 'userId', type: 'uuid', nullable: true })
  userId?: string;

  @ManyToOne(() => User, { eager: false, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column('enum', { enum: AuditActionType })
  action!: AuditActionType;

  @Column('json', { nullable: true })
  changes?: Record<string, any>;

  @Column('json', { nullable: true })
  oldValues?: Record<string, any>;

  @Column('json', { nullable: true })
  newValues?: Record<string, any>;

  @Column('text', { nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
