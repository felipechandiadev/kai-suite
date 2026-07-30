import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/** Marcaciones opcionales (P2) — sugieren excepciones; no son el camino default. */
@Entity('hr_time_entries')
@Index(['companyId', 'employeeId', 'occurredAt'])
@Index(['idempotencyKey'], { unique: true, where: '"idempotencyKey" IS NOT NULL' })
export class HrTimeEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  employeeId!: string;

  @Column({ type: 'varchar', length: 16 })
  kind!: 'IN' | 'OUT';

  @Column({ type: 'timestamptz' })
  occurredAt!: Date;

  @Column({ type: 'varchar', length: 64, nullable: true })
  deviceId?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  idempotencyKey?: string | null;

  @Column({ type: 'uuid', nullable: true })
  suggestedExceptionId?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
