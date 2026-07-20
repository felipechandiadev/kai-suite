import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { CompensatoryLedgerEntryType } from './hr-jornada.enums';

@Entity('hr_compensatory_ledger_entries')
@Index(['companyId', 'employeeId'])
export class HrCompensatoryLedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  employeeId!: string;

  @Column({ type: 'varchar', length: 16 })
  entryType!: CompensatoryLedgerEntryType;

  /** Minutos (positivo). Signo lo da entryType. */
  @Column({ type: 'int' })
  minutes!: number;

  @Column({ type: 'date', nullable: true })
  workDate?: string | null;

  @Column({ type: 'date', nullable: true })
  expiresOn?: string | null;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @Column({ type: 'uuid', nullable: true })
  sourceAssignmentId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
