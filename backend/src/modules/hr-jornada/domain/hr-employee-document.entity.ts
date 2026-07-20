import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { HrDocumentKind, HrDocumentStatus } from './hr-jornada.enums';

@Entity('hr_employee_documents')
@Index(['companyId', 'employeeId', 'kind'])
export class HrEmployeeDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  employeeId!: string;

  @Column({ type: 'varchar', length: 48 })
  kind!: HrDocumentKind;

  @Column({ type: 'date' })
  periodStart!: string;

  @Column({ type: 'date' })
  periodEnd!: string;

  @Column({ type: 'varchar', length: 64 })
  contentHash!: string;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ type: 'varchar', length: 16, default: HrDocumentStatus.CURRENT })
  status!: HrDocumentStatus;

  @Column({ type: 'uuid', nullable: true })
  generatedBy?: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  signedDocumentUrl?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  signedAt?: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  snapshotJson?: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
