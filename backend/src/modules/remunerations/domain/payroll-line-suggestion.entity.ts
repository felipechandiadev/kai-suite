import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PayrollLineSuggestionStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DISMISSED = 'DISMISSED',
}

@Entity('payroll_line_suggestions')
@Index(['companyId', 'employeeId', 'periodStart'])
@Index(['sourceEventId'], { unique: true })
export class PayrollLineSuggestion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  employeeId!: string;

  @Column({ type: 'date' })
  periodStart!: string;

  @Column({ type: 'date' })
  periodEnd!: string;

  @Column({ type: 'varchar', length: 48 })
  typeId!: string;

  @Column({ type: 'bigint' })
  amountCents!: string;

  @Column({ type: 'varchar', length: 64 })
  sourceEventId!: string;

  @Column({ type: 'varchar', length: 64 })
  sourceEventType!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    type: 'varchar',
    length: 16,
    default: PayrollLineSuggestionStatus.PENDING,
  })
  status!: PayrollLineSuggestionStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
