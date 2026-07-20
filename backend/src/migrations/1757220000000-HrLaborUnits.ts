import { MigrationInterface, QueryRunner } from 'typeorm';

export class HrLaborUnits1757220000000 implements MigrationInterface {
  name = 'HrLaborUnits1757220000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr_labor_units (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        code varchar(32) NOT NULL,
        name varchar(150) NOT NULL,
        description text NULL,
        "branchId" uuid NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_labor_units_company_code
      ON hr_labor_units ("companyId", code)
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_labor_units_company
      ON hr_labor_units ("companyId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_labor_units_branch
      ON hr_labor_units ("branchId")
      WHERE "branchId" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr_labor_unit_storages (
        "companyId" uuid NOT NULL,
        "laborUnitId" uuid NOT NULL,
        "storageId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("laborUnitId", "storageId")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_labor_unit_storages_storage
      ON hr_labor_unit_storages ("storageId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_labor_unit_storages_company
      ON hr_labor_unit_storages ("companyId")
    `);

    await queryRunner.query(`
      ALTER TABLE employees
      ADD COLUMN IF NOT EXISTS "laborUnitId" uuid NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_labor_unit
      ON employees ("laborUnitId")
      WHERE "laborUnitId" IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE organizational_units
      ADD COLUMN IF NOT EXISTS "laborUnitId" uuid NULL
    `);

    await queryRunner.query(`
      ALTER TABLE production_units
      ADD COLUMN IF NOT EXISTS labor_unit_id uuid NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_production_units_labor_unit
      ON production_units (labor_unit_id)
      WHERE labor_unit_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_production_units_labor_unit`,
    );
    await queryRunner.query(`
      ALTER TABLE production_units DROP COLUMN IF EXISTS labor_unit_id
    `);
    await queryRunner.query(`
      ALTER TABLE organizational_units DROP COLUMN IF EXISTS "laborUnitId"
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_employees_labor_unit`);
    await queryRunner.query(`
      ALTER TABLE employees DROP COLUMN IF EXISTS "laborUnitId"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS hr_labor_unit_storages`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr_labor_units`);
  }
}
