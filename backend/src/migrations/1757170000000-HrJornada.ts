import { MigrationInterface, QueryRunner } from 'typeorm';

export class HrJornada1757170000000 implements MigrationInterface {
  name = 'HrJornada1757170000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE employees_work_regime_enum AS ENUM (
          'ORDINARY', 'PARTIAL', 'EXCEPTIONAL_ART38'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE employees
      ADD COLUMN IF NOT EXISTS "workRegime" employees_work_regime_enum
        NOT NULL DEFAULT 'ORDINARY'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr_jornada_config (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "enforcementMode" varchar(32) NOT NULL DEFAULT 'ALERT_ONLY',
        "monthlyOrdinaryHours" int NOT NULL DEFAULT 180,
        "overtimeMultiplier" numeric(6,3) NOT NULL DEFAULT 1.5,
        "minRestBetweenShiftsMinutes" int NOT NULL DEFAULT 660,
        "nightStart" varchar(5) NOT NULL DEFAULT '21:00',
        "nightEnd" varchar(5) NOT NULL DEFAULT '07:00',
        "maxWeeklyMinutes" int NULL,
        "maxMonthlyMinutes" int NULL,
        "maxDailyOvertimeMinutes" int NOT NULL DEFAULT 120,
        "allowShiftOverlap" boolean NOT NULL DEFAULT true,
        "exceptionDeductionPolicy" jsonb NULL,
        "compensatoryExpiryDays" int NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_jornada_config_company
      ON hr_jornada_config ("companyId")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr_holidays (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        date date NOT NULL,
        name varchar(160) NOT NULL,
        "countryCode" varchar(8) NOT NULL DEFAULT 'CL',
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_holidays_date ON hr_holidays (date)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr_holiday_overrides (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        date date NOT NULL,
        name varchar(160) NOT NULL,
        "isRemoved" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_holiday_overrides_company_date
      ON hr_holiday_overrides ("companyId", date)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr_shift_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        name varchar(120) NOT NULL,
        type varchar(32) NOT NULL,
        "isNight" boolean NOT NULL DEFAULT false,
        "isNightOutgoing" boolean NOT NULL DEFAULT false,
        "scheduleJson" jsonb NULL,
        timezone varchar(64) NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_shift_templates_company
      ON hr_shift_templates ("companyId")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr_shift_instances (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "templateId" uuid NULL,
        "workDate" date NOT NULL,
        "startTime" varchar(5) NOT NULL,
        "endTime" varchar(5) NOT NULL,
        timezone varchar(64) NOT NULL DEFAULT 'America/Santiago',
        "isNight" boolean NOT NULL DEFAULT false,
        "isNightOutgoing" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_shift_instances_company_date
      ON hr_shift_instances ("companyId", "workDate")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr_shift_assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "instanceId" uuid NOT NULL REFERENCES hr_shift_instances(id) ON DELETE CASCADE,
        "employeeId" uuid NOT NULL,
        "plannedOvertimeMinutes" int NOT NULL DEFAULT 0,
        notes text NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_shift_assignments_instance_employee
      ON hr_shift_assignments ("instanceId", "employeeId")
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_shift_assignments_employee
      ON hr_shift_assignments ("companyId", "employeeId")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr_shift_exceptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "employeeId" uuid NOT NULL,
        "assignmentId" uuid NULL,
        "workDate" date NOT NULL,
        type varchar(32) NOT NULL,
        minutes int NOT NULL DEFAULT 0,
        notes text NULL,
        "affectsPayroll" boolean NOT NULL DEFAULT true,
        "createdBy" uuid NULL,
        settled boolean NOT NULL DEFAULT false,
        "settledAt" timestamptz NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_shift_exceptions_employee
      ON hr_shift_exceptions ("companyId", "employeeId")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr_compensatory_ledger_entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "employeeId" uuid NOT NULL,
        "entryType" varchar(16) NOT NULL,
        minutes int NOT NULL,
        "workDate" date NULL,
        "expiresOn" date NULL,
        reason text NULL,
        "sourceAssignmentId" uuid NULL,
        "createdBy" uuid NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_compensatory_ledger_employee
      ON hr_compensatory_ledger_entries ("companyId", "employeeId")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr_schedule_finding_audits (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "userId" uuid NULL,
        "weekStart" date NOT NULL,
        findings jsonb NOT NULL,
        "overrideReason" text NULL,
        "worstSeverity" varchar(16) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_schedule_finding_audits_company
      ON hr_schedule_finding_audits ("companyId", "createdAt")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr_employee_documents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "employeeId" uuid NOT NULL,
        kind varchar(48) NOT NULL,
        "periodStart" date NOT NULL,
        "periodEnd" date NOT NULL,
        "contentHash" varchar(64) NOT NULL,
        version int NOT NULL DEFAULT 1,
        status varchar(16) NOT NULL DEFAULT 'CURRENT',
        "generatedBy" uuid NULL,
        "signedDocumentUrl" varchar(512) NULL,
        "signedAt" timestamptz NULL,
        "snapshotJson" jsonb NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_employee_documents_employee
      ON hr_employee_documents ("companyId", "employeeId", kind)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr_time_entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "employeeId" uuid NOT NULL,
        kind varchar(16) NOT NULL,
        "occurredAt" timestamptz NOT NULL,
        "deviceId" varchar(64) NULL,
        "idempotencyKey" varchar(128) NULL,
        "suggestedExceptionId" uuid NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_time_entries_idempotency
      ON hr_time_entries ("idempotencyKey")
      WHERE "idempotencyKey" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payroll_line_suggestions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "employeeId" uuid NOT NULL,
        "periodStart" date NOT NULL,
        "periodEnd" date NOT NULL,
        "typeId" varchar(48) NOT NULL,
        "amountCents" bigint NOT NULL,
        "sourceEventId" varchar(64) NOT NULL,
        "sourceEventType" varchar(64) NOT NULL,
        description text NULL,
        status varchar(16) NOT NULL DEFAULT 'PENDING',
        metadata jsonb NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_line_suggestions_event
      ON payroll_line_suggestions ("sourceEventId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payroll_line_suggestions_employee
      ON payroll_line_suggestions ("companyId", "employeeId", "periodStart")
    `);

    // Seed Chile holidays 2026 (fixed + known)
    await queryRunner.query(`
      INSERT INTO hr_holidays (date, name, "countryCode") VALUES
        ('2026-01-01', 'Año Nuevo', 'CL'),
        ('2026-04-03', 'Viernes Santo', 'CL'),
        ('2026-05-01', 'Día del Trabajador', 'CL'),
        ('2026-05-21', 'Día de las Glorias Navales', 'CL'),
        ('2026-06-21', 'Día Nacional de los Pueblos Indígenas', 'CL'),
        ('2026-06-29', 'San Pedro y San Pablo', 'CL'),
        ('2026-07-16', 'Virgen del Carmen', 'CL'),
        ('2026-08-15', 'Asunción de la Virgen', 'CL'),
        ('2026-09-18', 'Independencia Nacional', 'CL'),
        ('2026-09-19', 'Día de las Glorias del Ejército', 'CL'),
        ('2026-10-12', 'Encuentro de Dos Mundos', 'CL'),
        ('2026-10-31', 'Día de las Iglesias Evangélicas y Protestantes', 'CL'),
        ('2026-11-01', 'Día de Todos los Santos', 'CL'),
        ('2026-12-08', 'Inmaculada Concepción', 'CL'),
        ('2026-12-25', 'Navidad', 'CL')
      ON CONFLICT (date) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS payroll_line_suggestions`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr_time_entries`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr_employee_documents`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr_schedule_finding_audits`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr_compensatory_ledger_entries`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr_shift_exceptions`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr_shift_assignments`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr_shift_instances`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr_shift_templates`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr_holiday_overrides`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr_holidays`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr_jornada_config`);
    await queryRunner.query(`
      ALTER TABLE employees DROP COLUMN IF EXISTS "workRegime"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS employees_work_regime_enum`);
  }
}
