import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M1 contrato: weeklyHours, extraHoursMode, Isapre, mutualName;
 * workRegime nullable; defaults jornada; backfills LABOR/FEE/PART_TIME.
 */
export class HcmContractWeeklyHoursIsapre1757240000000
  implements MigrationInterface
{
  name = 'HcmContractWeeklyHoursIsapre1757240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr_isapres (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        code varchar(32) NOT NULL,
        "externalCode" varchar(32) NOT NULL,
        name varchar(150) NOT NULL,
        website varchar(255) NULL,
        phone varchar(64) NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_isapres_company_code
      ON hr_isapres ("companyId", code)
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_isapres_company_external
      ON hr_isapres ("companyId", "externalCode")
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_isapres_company
      ON hr_isapres ("companyId")
    `);

    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ALTER COLUMN "workRegime" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ALTER COLUMN "workRegime" DROP DEFAULT
    `);

    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "weeklyHours" numeric(4,1) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "extraHoursMode" varchar(32) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "isapreId" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "isapreCode" varchar(32) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "isapreName" varchar(150) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "healthContributionMode" varchar(16) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "healthContributionValue" varchar(32) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "mutualName" varchar(150) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE hr_jornada_config
      ADD COLUMN IF NOT EXISTS "defaultWeeklyHours" numeric(4,1) NOT NULL DEFAULT 45
    `);
    await queryRunner.query(`
      ALTER TABLE hr_jornada_config
      ADD COLUMN IF NOT EXISTS "defaultExtraHoursMode" varchar(32) NOT NULL DEFAULT 'PAID_OVERTIME'
    `);

    // PART_TIME laborType → PARTIAL regime
    await queryRunner.query(`
      UPDATE hr_employment_contracts
      SET "workRegime" = 'PARTIAL'
      WHERE kind = 'LABOR'
        AND "laborType" = 'PART_TIME'
        AND ("workRegime" IS NULL OR "workRegime" <> 'PARTIAL')
    `);

    // LABOR defaults
    await queryRunner.query(`
      UPDATE hr_employment_contracts c
      SET "extraHoursMode" = 'PAID_OVERTIME'
      WHERE c.kind = 'LABOR' AND c."extraHoursMode" IS NULL
    `);
    await queryRunner.query(`
      UPDATE hr_employment_contracts c
      SET "weeklyHours" = 30
      WHERE c.kind = 'LABOR'
        AND c."workRegime" = 'PARTIAL'
        AND c."weeklyHours" IS NULL
    `);
    await queryRunner.query(`
      UPDATE hr_employment_contracts c
      SET "weeklyHours" = COALESCE(
        (
          SELECT cfg."defaultWeeklyHours"
          FROM hr_jornada_config cfg
          WHERE cfg."companyId" = c."companyId"
          LIMIT 1
        ),
        45
      )
      WHERE c.kind = 'LABOR'
        AND (c."workRegime" IS NULL OR c."workRegime" <> 'PARTIAL')
        AND c."weeklyHours" IS NULL
    `);

    // FEE cleanup
    await queryRunner.query(`
      UPDATE hr_employment_contracts
      SET
        "workRegime" = NULL,
        "laborType" = NULL,
        "weeklyHours" = NULL,
        "extraHoursMode" = NULL,
        "afpId" = NULL,
        "afpCode" = NULL,
        "afpName" = NULL,
        "afpContributionPercent" = NULL,
        "healthSystem" = NULL,
        "isapreId" = NULL,
        "isapreCode" = NULL,
        "isapreName" = NULL,
        "healthContributionMode" = NULL,
        "healthContributionValue" = NULL,
        "mutualName" = NULL,
        "tipsEligible" = false
      WHERE kind = 'FEE'
    `);

    // Seed Isapres for every company that has employees or contracts
    await queryRunner.query(`
      INSERT INTO hr_isapres (
        "companyId", code, "externalCode", name, website, phone
      )
      SELECT
        c.id,
        v.code,
        v.ext,
        v.name,
        v.website,
        v.phone
      FROM companies c
      CROSS JOIN (
        VALUES
          ('ISA00001', '99', 'Banmédica S.A.', 'www.banmedica.cl', '600 600 3600'),
          ('ISA00002', '63', 'Isalud Ltda.', 'https://www.isapredecodelco.cl', '6003 800 331'),
          ('ISA00003', '67', 'Colmena Golden Cross S.A.', 'www.colmena.cl', '800 633 444'),
          ('ISA00004', '107', 'Consalud S.A.', 'www.consalud.cl', '600 500 9000'),
          ('ISA00005', '78', 'Cruz Blanca S.A.', 'www.cruzblanca.cl', '600 818 0000'),
          ('ISA00006', '94', 'Cruz del Norte Ltda.', 'www.isaprecruzdelnorte.cl', '97 799365'),
          ('ISA00007', '81', 'Nueva Masvida S.A.', 'www.nuevamasvida.cl', '600 600 262'),
          ('ISA00008', '76', 'Fundación Ltda.', 'www.isaprefundacion.cl', '22 347 9000'),
          ('ISA00009', '80', 'Vida Tres S.A.', 'www.vidatres.cl', '600 600 3535'),
          ('ISA00010', '108', 'Esencial S.A.', 'www.somosesencial.cl', '600 0880 090')
      ) AS v(code, ext, name, website, phone)
      WHERE c."deletedAt" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM hr_isapres i
          WHERE i."companyId" = c.id AND i.code = v.code AND i."deletedAt" IS NULL
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE hr_jornada_config
      DROP COLUMN IF EXISTS "defaultExtraHoursMode"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_jornada_config
      DROP COLUMN IF EXISTS "defaultWeeklyHours"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "mutualName"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "healthContributionValue"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "healthContributionMode"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "isapreName"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "isapreCode"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "isapreId"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "extraHoursMode"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "weeklyHours"
    `);
    await queryRunner.query(`
      UPDATE hr_employment_contracts
      SET "workRegime" = 'ORDINARY'
      WHERE "workRegime" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ALTER COLUMN "workRegime" SET DEFAULT 'ORDINARY'
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ALTER COLUMN "workRegime" SET NOT NULL
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS hr_isapres`);
  }
}
