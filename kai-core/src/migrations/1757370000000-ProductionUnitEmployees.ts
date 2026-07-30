import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductionUnitEmployees1757370000000
  implements MigrationInterface
{
  name = 'ProductionUnitEmployees1757370000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS production_unit_employees (
        "companyId" uuid NOT NULL,
        "productionUnitId" uuid NOT NULL,
        "employeeId" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY ("productionUnitId", "employeeId")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pu_employees_production_unit
      ON production_unit_employees ("productionUnitId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pu_employees_company
      ON production_unit_employees ("companyId")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_pu_employees_company_employee
      ON production_unit_employees ("companyId", "employeeId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS production_unit_employees
    `);
  }
}
