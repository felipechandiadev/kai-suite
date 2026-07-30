import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { AutomationEventType } from './automation-event-type.enum';
import { AutomationAction } from './automation-action.entity';

@Entity('automation_rules')
@Index(['companyId', 'eventType', 'isActive'])
export class AutomationRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'enum', enum: AutomationEventType })
  eventType!: AutomationEventType;

  /** JSON con filtros de matching (transactionType, paymentMethod, branchId, etc.) */
  @Column({ type: 'json', nullable: true })
  filters?: Record<string, any> | null;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => AutomationAction, (a) => a.rule, { cascade: false })
  actions?: AutomationAction[];
}

