import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M2: turnos por unidad laboral + membresías; backfill desde hr_employee_shifts.
 */
export class HcmLaborUnitShifts1757250000000 implements MigrationInterface {
  name = 'HcmLaborUnitShifts1757250000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr_labor_unit_shifts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "laborUnitId" uuid NOT NULL,
        code varchar(32) NOT NULL,
        name varchar(120) NOT NULL,
        "scheduleJson" jsonb NULL,
        timezone varchar(64) NOT NULL DEFAULT 'America/Santiago',
        "isActive" boolean NOT NULL DEFAULT true,
        "effectiveFrom" date NULL,
        "effectiveTo" date NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_labor_unit_shifts_company_code
      ON hr_labor_unit_shifts ("companyId", code)
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_labor_unit_shifts_ul
      ON hr_labor_unit_shifts ("companyId", "laborUnitId")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr_labor_unit_shift_members (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "shiftId" uuid NOT NULL,
        "employeeId" uuid NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'ACTIVE',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_lus_member_active_employee
      ON hr_labor_unit_shift_members ("companyId", "employeeId")
      WHERE status = 'ACTIVE'
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_lus_members_shift
      ON hr_labor_unit_shift_members ("companyId", "shiftId")
    `);

    // Backfill: one UL shift + membership per ACTIVE employee shift
    await queryRunner.query(`
      WITH src AS (
        SELECT
          es."companyId",
          e."laborUnitId",
          es.name,
          es."scheduleJson",
          COALESCE(es.timezone, 'America/Santiago') AS timezone,
          es."effectiveFrom",
          es."effectiveTo",
          e.id AS employee_id,
          ROW_NUMBER() OVER (
            PARTITION BY es."companyId"
            ORDER BY es."createdAt", es.id
          ) AS seq
        FROM hr_employee_shifts es
        INNER JOIN employees e
          ON e.id = es."employeeId"
         AND e."companyId" = es."companyId"
         AND e."deletedAt" IS NULL
        WHERE es."deletedAt" IS NULL
          AND es.status = 'ACTIVE'
          AND e."laborUnitId" IS NOT NULL
      ),
      inserted AS (
        INSERT INTO hr_labor_unit_shifts (
          id, "companyId", "laborUnitId", code, name, "scheduleJson", timezone,
          "isActive", "effectiveFrom", "effectiveTo"
        )
        SELECT
          gen_random_uuid(),
          s."companyId",
          s."laborUnitId",
          'ULS' || LPAD(s.seq::text, 5, '0'),
          s.name,
          s."scheduleJson",
          s.timezone,
          true,
          s."effectiveFrom",
          s."effectiveTo"
        FROM src s
        RETURNING id, "companyId", code
      )
      INSERT INTO hr_labor_unit_shift_members (
        "companyId", "shiftId", "employeeId", status
      )
      SELECT
        i."companyId",
        i.id,
        s.employee_id,
        'ACTIVE'
      FROM inserted i
      INNER JOIN src s
        ON s."companyId" = i."companyId"
       AND ('ULS' || LPAD(s.seq::text, 5, '0')) = i.code
      WHERE NOT EXISTS (
        SELECT 1 FROM hr_labor_unit_shift_members m
        WHERE m."companyId" = i."companyId"
          AND m."employeeId" = s.employee_id
          AND m.status = 'ACTIVE'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hr_labor_unit_shift_members`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr_labor_unit_shifts`);
  }
}
