import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
  CreateDateColumn,
} from 'typeorm';
import { UserOrmEntity } from '@modules/users/infrastructure/orm-mappers/user.orm-entity';
import { AuditActionType } from '@modules/audits/domain/audit.types';

@Entity('audits')
export class AuditOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  entityName!: string;

  @Column('varchar', { length: 255 })
  entityId!: string;

  @Column({ name: 'userId', type: 'uuid', nullable: true })
  userId?: string;

  @ManyToOne(() => UserOrmEntity, {
    eager: false,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'userId' })
  user?: UserOrmEntity;

  @Column({ type: 'varchar', length: 32 })
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
