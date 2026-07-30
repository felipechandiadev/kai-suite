import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductionUnitScopeAndMode1756980000000
  implements MigrationInterface
{
  name = 'ProductionUnitScopeAndMode1756980000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE production_units
      ADD COLUMN IF NOT EXISTS scope character varying(16) NOT NULL DEFAULT 'BRANCH';
    `);
    await queryRunner.query(`
      ALTER TABLE production_units
      ADD COLUMN IF NOT EXISTS inventory_mode character varying(16) NOT NULL DEFAULT 'DEPENDENT';
    `);
    await queryRunner.query(`
      ALTER TABLE production_units
      ADD COLUMN IF NOT EXISTS default_output_storage_id uuid;
    `);

    await queryRunner.query(`
      UPDATE production_units
      SET scope = 'BRANCH', inventory_mode = 'DEPENDENT'
      WHERE scope IS NULL OR inventory_mode IS NULL OR scope = '' OR inventory_mode = '';
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "uq_production_units_company_branch_code";
    `);

    await queryRunner.query(`
      ALTER TABLE production_units
      ALTER COLUMN branch_id DROP NOT NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_production_units_branch_code"
      ON production_units (company_id, branch_id, code)
      WHERE scope = 'BRANCH';
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_production_units_company_code"
      ON production_units (company_id, code)
      WHERE scope = 'COMPANY';
    `);

    const fkOut: Array<{ exists: boolean }> = await queryRunner.query(
      `SELECT EXISTS (
         SELECT 1
         FROM pg_constraint c
         JOIN pg_class t ON t.oid = c.conrelid
         JOIN pg_namespace n ON n.oid = t.relnamespace
         WHERE n.nspname = current_schema()
           AND t.relname = 'production_units'
           AND c.conname = 'FK_production_units_default_output_storage'
           AND c.contype = 'f'
       ) AS exists`,
    );
    if (!fkOut[0]?.exists) {
      await queryRunner.query(`
        ALTER TABLE production_units
        ADD CONSTRAINT "FK_production_units_default_output_storage"
        FOREIGN KEY (default_output_storage_id) REFERENCES storages(id)
        ON DELETE SET NULL ON UPDATE NO ACTION;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE production_units DROP CONSTRAINT IF EXISTS "FK_production_units_default_output_storage";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_production_units_company_code";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_production_units_branch_code";`,
    );

    await queryRunner.query(`
      DELETE FROM production_units WHERE branch_id IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE production_units
      ALTER COLUMN branch_id SET NOT NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_production_units_company_branch_code"
      ON production_units (company_id, branch_id, code);
    `);

    await queryRunner.query(`
      ALTER TABLE production_units DROP COLUMN IF EXISTS default_output_storage_id;
    `);
    await queryRunner.query(`
      ALTER TABLE production_units DROP COLUMN IF EXISTS inventory_mode;
    `);
    await queryRunner.query(`
      ALTER TABLE production_units DROP COLUMN IF EXISTS scope;
    `);
  }
}
