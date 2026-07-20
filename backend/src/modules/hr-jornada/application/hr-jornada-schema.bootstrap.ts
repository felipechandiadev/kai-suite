import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class HrJornadaSchemaBootstrap implements OnModuleInit {
  private readonly logger = new Logger(HrJornadaSchemaBootstrap.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.dataSource.query(`
        DO $$ BEGIN
          CREATE TYPE employees_work_regime_enum AS ENUM (
            'ORDINARY', 'PARTIAL', 'EXCEPTIONAL_ART38'
          );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `);
      await this.dataSource.query(`
        ALTER TABLE employees
        ADD COLUMN IF NOT EXISTS "workRegime" employees_work_regime_enum
          NOT NULL DEFAULT 'ORDINARY'
      `);

      await this.dataSource.query(`
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
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_jornada_config_company
        ON hr_jornada_config ("companyId")
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS hr_holidays (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          date date NOT NULL,
          name varchar(160) NOT NULL,
          "countryCode" varchar(8) NOT NULL DEFAULT 'CL',
          "createdAt" timestamptz NOT NULL DEFAULT now()
        )
      `);
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_holidays_date ON hr_holidays (date)
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS hr_holiday_overrides (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "companyId" uuid NOT NULL,
          date date NOT NULL,
          name varchar(160) NOT NULL,
          "isRemoved" boolean NOT NULL DEFAULT false,
          "createdAt" timestamptz NOT NULL DEFAULT now()
        )
      `);
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_holiday_overrides_company_date
        ON hr_holiday_overrides ("companyId", date)
      `);

      await this.dataSource.query(`
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

      await this.dataSource.query(`
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
      await this.dataSource.query(`
        ALTER TABLE hr_shift_instances
        ADD COLUMN IF NOT EXISTS "laborUnitShiftId" uuid NULL
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS hr_shift_assignments (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "companyId" uuid NOT NULL,
          "instanceId" uuid NOT NULL,
          "employeeId" uuid NOT NULL,
          "plannedOvertimeMinutes" int NOT NULL DEFAULT 0,
          notes text NULL,
          "createdAt" timestamptz NOT NULL DEFAULT now(),
          "updatedAt" timestamptz NOT NULL DEFAULT now(),
          "deletedAt" timestamptz NULL
        )
      `);

      await this.dataSource.query(`
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

      await this.dataSource.query(`
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

      await this.dataSource.query(`
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

      await this.dataSource.query(`
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

      await this.dataSource.query(`
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

      await this.dataSource.query(`
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
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_line_suggestions_event
        ON payroll_line_suggestions ("sourceEventId")
      `);

      await this.dataSource.query(`
        ALTER TABLE hr_jornada_config
        ADD COLUMN IF NOT EXISTS "defaultMealAllowance" bigint NOT NULL DEFAULT 0
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_jornada_config
        ADD COLUMN IF NOT EXISTS "defaultTransportAllowance" bigint NOT NULL DEFAULT 0
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_jornada_config
        ADD COLUMN IF NOT EXISTS "defaultWorkRegime" varchar(32) NOT NULL DEFAULT 'ORDINARY'
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_jornada_config
        ADD COLUMN IF NOT EXISTS "defaultWeeklyHours" numeric(4,1) NOT NULL DEFAULT 45
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_jornada_config
        ADD COLUMN IF NOT EXISTS "defaultExtraHoursMode" varchar(32) NOT NULL DEFAULT 'PAID_OVERTIME'
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_jornada_config
        ADD COLUMN IF NOT EXISTS "defaultShiftSystemId" uuid NULL
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS hr_shift_systems (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "companyId" uuid NOT NULL,
          code varchar(32) NOT NULL,
          name varchar(120) NOT NULL,
          type varchar(32) NOT NULL,
          "requiresPlannerAssignment" boolean NOT NULL DEFAULT false,
          "generatesLateEvents" boolean NOT NULL DEFAULT true,
          "overtimeEnabled" boolean NOT NULL DEFAULT true,
          "cycleConfigJson" jsonb NULL,
          "isActive" boolean NOT NULL DEFAULT true,
          "createdAt" timestamptz NOT NULL DEFAULT now(),
          "updatedAt" timestamptz NOT NULL DEFAULT now(),
          "deletedAt" timestamptz NULL
        )
      `);
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_shift_systems_company_code
        ON hr_shift_systems ("companyId", code)
        WHERE "deletedAt" IS NULL
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS hr_employment_contracts (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "companyId" uuid NOT NULL,
          "employeeId" uuid NOT NULL,
          "branchId" uuid NULL,
          kind varchar(16) NOT NULL,
          "laborType" varchar(32) NULL,
          status varchar(16) NOT NULL DEFAULT 'DRAFT',
          "startDate" date NOT NULL,
          "endDate" date NULL,
          "baseSalary" bigint NULL,
          "feeAmount" bigint NULL,
          "workRegime" varchar(32) NOT NULL DEFAULT 'ORDINARY',
          "mealAllowance" bigint NOT NULL DEFAULT 0,
          "transportAllowance" bigint NOT NULL DEFAULT 0,
          "afpCode" varchar(64) NULL,
          "healthSystem" varchar(32) NULL,
          notes text NULL,
          "documentUrl" varchar(512) NULL,
          "createdAt" timestamptz NOT NULL DEFAULT now(),
          "updatedAt" timestamptz NOT NULL DEFAULT now()
        )
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_employment_contracts
        ADD COLUMN IF NOT EXISTS "shiftSystemId" uuid NULL
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_employment_contracts
        ADD COLUMN IF NOT EXISTS "shiftSystemCode" varchar(32) NULL
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_employment_contracts
        ADD COLUMN IF NOT EXISTS "shiftSystemName" varchar(120) NULL
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_employment_contracts
        ADD COLUMN IF NOT EXISTS "shiftSystemType" varchar(32) NULL
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_employment_contracts
        ADD COLUMN IF NOT EXISTS "fixedScheduleJson" jsonb NULL
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_employment_contracts
        ADD COLUMN IF NOT EXISTS "flexibleMode" varchar(16) NULL
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_employment_contracts
        ADD COLUMN IF NOT EXISTS "flexibleBandJson" jsonb NULL
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_employment_contracts
        ADD COLUMN IF NOT EXISTS "art22Exempt" boolean NULL
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_employment_contracts
        ADD COLUMN IF NOT EXISTS "exceptionalResolutionRef" varchar(255) NULL
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_employment_contracts
        DROP COLUMN IF EXISTS "gratificationMode"
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_jornada_config
        DROP COLUMN IF EXISTS "defaultGratificationMode"
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_employment_contracts
        ADD COLUMN IF NOT EXISTS "supersedesContractId" uuid NULL
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_employment_contracts
        ADD COLUMN IF NOT EXISTS "jobPositionId" uuid NULL
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_employment_contracts
        ADD COLUMN IF NOT EXISTS duties text NULL
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_employment_contracts
        ADD COLUMN IF NOT EXISTS "salesCommissionType" varchar(16) NOT NULL DEFAULT 'NONE'
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_employment_contracts
        ADD COLUMN IF NOT EXISTS "salesCommissionValue" varchar(32) NULL
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_employment_contracts
        ADD COLUMN IF NOT EXISTS "tipsEligible" boolean NOT NULL DEFAULT false
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_employment_contracts
        ADD COLUMN IF NOT EXISTS "afpId" uuid NULL
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_employment_contracts
        ADD COLUMN IF NOT EXISTS "afpName" varchar(150) NULL
      `);
      await this.dataSource.query(`
        ALTER TABLE hr_employment_contracts
        ADD COLUMN IF NOT EXISTS "afpContributionPercent" varchar(16) NULL
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS hr_afp_funds (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "companyId" uuid NOT NULL,
          code varchar(32) NOT NULL,
          name varchar(150) NOT NULL,
          "contributionPercent" varchar(16) NOT NULL DEFAULT '0',
          "isActive" boolean NOT NULL DEFAULT true,
          "createdAt" timestamptz NOT NULL DEFAULT now(),
          "updatedAt" timestamptz NOT NULL DEFAULT now(),
          "deletedAt" timestamptz NULL
        )
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS hr_job_positions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "companyId" uuid NOT NULL,
          code varchar(64) NULL,
          name varchar(150) NOT NULL,
          description text NULL,
          "defaultDuties" text NULL,
          "isActive" boolean NOT NULL DEFAULT true,
          "sortOrder" int NOT NULL DEFAULT 0,
          "createdAt" timestamptz NOT NULL DEFAULT now(),
          "updatedAt" timestamptz NOT NULL DEFAULT now(),
          "deletedAt" timestamptz NULL
        )
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS hr_employee_timeline_entries (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "companyId" uuid NOT NULL,
          "employeeId" uuid NOT NULL,
          "occurredAt" timestamptz NOT NULL DEFAULT now(),
          kind varchar(64) NOT NULL,
          title varchar(255) NOT NULL,
          body text NULL,
          "actorUserId" uuid NULL,
          "sourceType" varchar(64) NULL,
          "sourceId" uuid NULL,
          payload jsonb NULL,
          "createdAt" timestamptz NOT NULL DEFAULT now()
        )
      `);

      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_employment_contracts_active
        ON hr_employment_contracts ("companyId", "employeeId")
        WHERE status = 'ACTIVE'
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS hr_employee_shifts (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "companyId" uuid NOT NULL,
          "employeeId" uuid NOT NULL,
          name varchar(120) NOT NULL,
          type varchar(32) NOT NULL DEFAULT 'WEEKLY',
          "scheduleJson" jsonb NULL,
          timezone varchar(64) NOT NULL DEFAULT 'America/Santiago',
          "templateId" uuid NULL,
          "isNight" boolean NOT NULL DEFAULT false,
          "isNightOutgoing" boolean NOT NULL DEFAULT false,
          status varchar(16) NOT NULL DEFAULT 'ACTIVE',
          "effectiveFrom" date NULL,
          "effectiveTo" date NULL,
          "createdAt" timestamptz NOT NULL DEFAULT now(),
          "updatedAt" timestamptz NOT NULL DEFAULT now(),
          "deletedAt" timestamptz NULL
        )
      `);
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_employee_shifts_active
        ON hr_employee_shifts ("companyId", "employeeId")
        WHERE status = 'ACTIVE' AND "deletedAt" IS NULL
      `);

      this.logger.log('hr-jornada schema bootstrap OK');
    } catch (err) {
      this.logger.error(
        `hr-jornada schema bootstrap failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }
}
