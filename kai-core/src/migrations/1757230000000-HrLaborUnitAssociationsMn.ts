import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * UL independiente: puentes M:N branch/OU/PU; drop FKs antiguas;
 * empleado.laborUnitId NOT NULL con backfill "Por asignar".
 */
export class HrLaborUnitAssociationsMn1757230000000
  implements MigrationInterface
{
  name = 'HrLaborUnitAssociationsMn1757230000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr_labor_unit_branches (
        "companyId" uuid NOT NULL,
        "laborUnitId" uuid NOT NULL,
        "branchId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("laborUnitId", "branchId")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_labor_unit_branches_branch
      ON hr_labor_unit_branches ("branchId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_labor_unit_branches_company
      ON hr_labor_unit_branches ("companyId")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr_labor_unit_organizational_units (
        "companyId" uuid NOT NULL,
        "laborUnitId" uuid NOT NULL,
        "organizationalUnitId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("laborUnitId", "organizationalUnitId")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_labor_unit_ous_ou
      ON hr_labor_unit_organizational_units ("organizationalUnitId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_labor_unit_ous_company
      ON hr_labor_unit_organizational_units ("companyId")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr_labor_unit_production_units (
        "companyId" uuid NOT NULL,
        "laborUnitId" uuid NOT NULL,
        "productionUnitId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("laborUnitId", "productionUnitId")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_labor_unit_pus_pu
      ON hr_labor_unit_production_units ("productionUnitId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_labor_unit_pus_company
      ON hr_labor_unit_production_units ("companyId")
    `);

    // Backfill from UL.branchId
    await queryRunner.query(`
      INSERT INTO hr_labor_unit_branches ("companyId", "laborUnitId", "branchId")
      SELECT lu."companyId", lu.id, lu."branchId"
      FROM hr_labor_units lu
      WHERE lu."branchId" IS NOT NULL
        AND lu."deletedAt" IS NULL
      ON CONFLICT DO NOTHING
    `);

    // Backfill from OU.laborUnitId
    await queryRunner.query(`
      INSERT INTO hr_labor_unit_organizational_units
        ("companyId", "laborUnitId", "organizationalUnitId")
      SELECT ou."companyId", ou."laborUnitId", ou.id
      FROM organizational_units ou
      WHERE ou."laborUnitId" IS NOT NULL
        AND ou."deletedAt" IS NULL
      ON CONFLICT DO NOTHING
    `);

    // Backfill from PU.labor_unit_id
    await queryRunner.query(`
      INSERT INTO hr_labor_unit_production_units
        ("companyId", "laborUnitId", "productionUnitId")
      SELECT pu.company_id, pu.labor_unit_id, pu.id
      FROM production_units pu
      WHERE pu.labor_unit_id IS NOT NULL
      ON CONFLICT DO NOTHING
    `);

    // Placeholder UL per company with employees missing laborUnitId
    await queryRunner.query(`
      INSERT INTO hr_labor_units (id, "companyId", code, name, description, "isActive")
      SELECT gen_random_uuid(), c."companyId", 'UL00000', 'Por asignar',
        'Unidad laboral temporal creada por migración; reasignar empleados.', true
      FROM (
        SELECT DISTINCT e."companyId" AS "companyId"
        FROM employees e
        WHERE e."laborUnitId" IS NULL
          AND e."deletedAt" IS NULL
          AND e."companyId" IS NOT NULL
      ) c
      WHERE NOT EXISTS (
        SELECT 1 FROM hr_labor_units lu
        WHERE lu."companyId" = c."companyId"
          AND lu.code = 'UL00000'
          AND lu."deletedAt" IS NULL
      )
    `);

    await queryRunner.query(`
      UPDATE employees e
      SET "laborUnitId" = lu.id
      FROM hr_labor_units lu
      WHERE e."laborUnitId" IS NULL
        AND e."deletedAt" IS NULL
        AND lu."companyId" = e."companyId"
        AND lu.code = 'UL00000'
        AND lu."deletedAt" IS NULL
    `);

    // Drop old columns
    await queryRunner.query(`DROP INDEX IF EXISTS idx_hr_labor_units_branch`);
    await queryRunner.query(`
      ALTER TABLE hr_labor_units DROP COLUMN IF EXISTS "branchId"
    `);
    await queryRunner.query(`
      ALTER TABLE organizational_units DROP COLUMN IF EXISTS "laborUnitId"
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_production_units_labor_unit`,
    );
    await queryRunner.query(`
      ALTER TABLE production_units DROP COLUMN IF EXISTS labor_unit_id
    `);

    // employees.laborUnitId NOT NULL (only if no nulls remain)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM employees
          WHERE "laborUnitId" IS NULL AND "deletedAt" IS NULL
        ) THEN
          ALTER TABLE employees
            ALTER COLUMN "laborUnitId" SET NOT NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE employees ALTER COLUMN "laborUnitId" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE production_units
      ADD COLUMN IF NOT EXISTS labor_unit_id uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE organizational_units
      ADD COLUMN IF NOT EXISTS "laborUnitId" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_labor_units
      ADD COLUMN IF NOT EXISTS "branchId" uuid NULL
    `);

    await queryRunner.query(`
      UPDATE hr_labor_units lu
      SET "branchId" = b."branchId"
      FROM (
        SELECT DISTINCT ON ("laborUnitId") "laborUnitId", "branchId"
        FROM hr_labor_unit_branches
      ) b
      WHERE lu.id = b."laborUnitId"
    `);
    await queryRunner.query(`
      UPDATE organizational_units ou
      SET "laborUnitId" = b."laborUnitId"
      FROM (
        SELECT DISTINCT ON ("organizationalUnitId")
          "organizationalUnitId", "laborUnitId"
        FROM hr_labor_unit_organizational_units
      ) b
      WHERE ou.id = b."organizationalUnitId"
    `);
    await queryRunner.query(`
      UPDATE production_units pu
      SET labor_unit_id = b."laborUnitId"
      FROM (
        SELECT DISTINCT ON ("productionUnitId")
          "productionUnitId", "laborUnitId"
        FROM hr_labor_unit_production_units
      ) b
      WHERE pu.id = b."productionUnitId"
    `);

    await queryRunner.query(
      `DROP TABLE IF EXISTS hr_labor_unit_production_units`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS hr_labor_unit_organizational_units`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS hr_labor_unit_branches`);
  }
}
