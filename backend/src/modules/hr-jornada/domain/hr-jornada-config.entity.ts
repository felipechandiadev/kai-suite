import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { EnforcementMode } from './hr-jornada.enums';

@Entity('hr_jornada_config')
@Index(['companyId'], { unique: true })
export class HrJornadaConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({
    type: 'varchar',
    length: 32,
    default: EnforcementMode.ALERT_ONLY,
  })
  enforcementMode!: EnforcementMode;

  /** Horas ordinarias mensuales para valor-hora (default 180). */
  @Column({ type: 'int', default: 180 })
  monthlyOrdinaryHours!: number;

  @Column({ type: 'numeric', precision: 6, scale: 3, default: 1.5 })
  overtimeMultiplier!: string;

  /** Descanso mínimo entre jornadas en minutos (default 11h = 660). */
  @Column({ type: 'int', default: 660 })
  minRestBetweenShiftsMinutes!: number;

  /** Inicio franja nocturna HH:mm */
  @Column({ type: 'varchar', length: 5, default: '21:00' })
  nightStart!: string;

  /** Fin franja nocturna HH:mm */
  @Column({ type: 'varchar', length: 5, default: '07:00' })
  nightEnd!: string;

  @Column({ type: 'int', nullable: true })
  maxWeeklyMinutes?: number | null;

  @Column({ type: 'int', nullable: true })
  maxMonthlyMinutes?: number | null;

  @Column({ type: 'int', default: 120 })
  maxDailyOvertimeMinutes!: number;

  @Column({ type: 'boolean', default: true })
  allowShiftOverlap!: boolean;

  /** Políticas de descuento por tipo de excepción (minutos → fracción, etc.). */
  @Column({ type: 'jsonb', nullable: true })
  exceptionDeductionPolicy?: Record<string, unknown> | null;

  /** Días hasta caducidad de crédito de descanso (P2). */
  @Column({ type: 'int', nullable: true })
  compensatoryExpiryDays?: number | null;

  @Column({ type: 'bigint', default: '0' })
  defaultMealAllowance!: string;

  @Column({ type: 'bigint', default: '0' })
  defaultTransportAllowance!: string;

  @Column({ type: 'varchar', length: 32, default: 'ORDINARY' })
  defaultWorkRegime!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
