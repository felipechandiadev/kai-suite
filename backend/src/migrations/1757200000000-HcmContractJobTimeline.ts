import { MigrationInterface, QueryRunner } from 'typeorm';

export class HcmContractJobTimeline1757200000000 implements MigrationInterface {
  name = 'HcmContractJobTimeline1757200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_job_positions_company
      ON hr_job_positions ("companyId")
    `);

    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "supersedesContractId" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "jobPositionId" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS duties text NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "salesCommissionType" varchar(16) NOT NULL DEFAULT 'NONE'
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "salesCommissionValue" varchar(32) NULL
    `);

    await queryRunner.query(`
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
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_employee_timeline_employee
      ON hr_employee_timeline_entries ("companyId", "employeeId", "occurredAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hr_employee_timeline_entries`);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "salesCommissionValue"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "salesCommissionType"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS duties
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "jobPositionId"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "supersedesContractId"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS hr_job_positions`);
  }
}
