import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M3: catálogo hr_shift_systems, campos shift en contrato, defaultShiftSystemId en jornada config.
 */
export class HcmShiftSystems1757260000000 implements MigrationInterface {
  name = 'HcmShiftSystems1757260000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_shift_systems_company_code
      ON hr_shift_systems ("companyId", code)
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_shift_systems_company
      ON hr_shift_systems ("companyId")
    `);

    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "shiftSystemId" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "shiftSystemCode" varchar(32) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "shiftSystemName" varchar(120) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "shiftSystemType" varchar(32) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "fixedScheduleJson" jsonb NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "flexibleMode" varchar(16) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "flexibleBandJson" jsonb NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "art22Exempt" boolean NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "exceptionalResolutionRef" varchar(255) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE hr_jornada_config
      ADD COLUMN IF NOT EXISTS "defaultShiftSystemId" uuid NULL
    `);

    // Seed catálogo base por empresa
    await queryRunner.query(`
      INSERT INTO hr_shift_systems (
        id, "companyId", code, name, type,
        "requiresPlannerAssignment", "generatesLateEvents", "overtimeEnabled",
        "cycleConfigJson", "isActive"
      )
      SELECT
        gen_random_uuid(),
        c.id,
        v.code,
        v.name,
        v.type,
        v.planner,
        v.late,
        v.ot,
        v.cycle,
        true
      FROM companies c
      CROSS JOIN (
        VALUES
          ('SS00001', 'Jornada fija', 'FIXED', false, true, true, NULL::jsonb),
          ('SS00002', 'Rotativo', 'ROTATING', true, true, true, NULL::jsonb),
          ('SS00003', 'Flexible con banda', 'FLEXIBLE', false, true, true, NULL::jsonb),
          ('SS00004', 'Flexible sin banda', 'FLEXIBLE', false, false, true, NULL::jsonb),
          ('SS00005', 'Sin control Art. 22', 'FREE', false, false, false, NULL::jsonb),
          ('SS00006', 'Excepcional DT', 'EXCEPTIONAL', true, true, true, '{"daysOn":4,"daysOff":4}'::jsonb)
      ) AS v(code, name, type, planner, late, ot, cycle)
      WHERE NOT EXISTS (
        SELECT 1 FROM hr_shift_systems s
        WHERE s."companyId" = c.id AND s.code = v.code AND s."deletedAt" IS NULL
      )
    `);

    // defaultShiftSystemId → Rotativo (SS00002)
    await queryRunner.query(`
      UPDATE hr_jornada_config cfg
      SET "defaultShiftSystemId" = s.id
      FROM hr_shift_systems s
      WHERE s."companyId" = cfg."companyId"
        AND s.code = 'SS00002'
        AND s."deletedAt" IS NULL
        AND cfg."defaultShiftSystemId" IS NULL
    `);

    // Backfill contratos LABOR sin shiftSystem
    await queryRunner.query(`
      UPDATE hr_employment_contracts c
      SET
        "shiftSystemId" = s.id,
        "shiftSystemCode" = s.code,
        "shiftSystemName" = s.name,
        "shiftSystemType" = s.type
      FROM hr_shift_systems s
      WHERE c.kind = 'LABOR'
        AND c."shiftSystemId" IS NULL
        AND s."companyId" = c."companyId"
        AND s.code = 'SS00002'
        AND s."deletedAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE hr_jornada_config
      DROP COLUMN IF EXISTS "defaultShiftSystemId"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "exceptionalResolutionRef"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "art22Exempt"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "flexibleBandJson"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "flexibleMode"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "fixedScheduleJson"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "shiftSystemType"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "shiftSystemName"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "shiftSystemCode"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "shiftSystemId"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS hr_shift_systems`);
  }
}
