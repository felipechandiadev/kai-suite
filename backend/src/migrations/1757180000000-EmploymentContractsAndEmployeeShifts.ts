import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmploymentContractsAndEmployeeShifts1757180000000
  implements MigrationInterface
{
  name = 'EmploymentContractsAndEmployeeShifts1757180000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE hr_jornada_config
      ADD COLUMN IF NOT EXISTS "defaultMealAllowance" bigint NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE hr_jornada_config
      ADD COLUMN IF NOT EXISTS "defaultTransportAllowance" bigint NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE hr_jornada_config
      ADD COLUMN IF NOT EXISTS "defaultWorkRegime" varchar(32) NOT NULL DEFAULT 'ORDINARY'
    `);

    await queryRunner.query(`
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
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_employment_contracts_employee
      ON hr_employment_contracts ("companyId", "employeeId")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_employment_contracts_active
      ON hr_employment_contracts ("companyId", "employeeId")
      WHERE status = 'ACTIVE'
    `);

    // Backfill ACTIVE LABOR contracts from employees
    await queryRunner.query(`
      INSERT INTO hr_employment_contracts (
        "companyId", "employeeId", "branchId", kind, "laborType", status,
        "startDate", "baseSalary", "workRegime"
      )
      SELECT
        e."companyId",
        e.id,
        e."branchId",
        'LABOR',
        'INDEFINITE',
        'ACTIVE',
        COALESCE(e."hireDate", CURRENT_DATE),
        e."baseSalary",
        COALESCE(e."workRegime"::text, 'ORDINARY')
      FROM employees e
      WHERE e."deletedAt" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM hr_employment_contracts c
          WHERE c."employeeId" = e.id AND c.status = 'ACTIVE'
        )
    `);

    await queryRunner.query(`
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
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_employee_shifts_employee
      ON hr_employee_shifts ("companyId", "employeeId")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_employee_shifts_active
      ON hr_employee_shifts ("companyId", "employeeId")
      WHERE status = 'ACTIVE' AND "deletedAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hr_employee_shifts`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr_employment_contracts`);
    await queryRunner.query(`
      ALTER TABLE hr_jornada_config
      DROP COLUMN IF EXISTS "defaultMealAllowance"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_jornada_config
      DROP COLUMN IF EXISTS "defaultTransportAllowance"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_jornada_config
      DROP COLUMN IF EXISTS "defaultWorkRegime"
    `);
  }
}
