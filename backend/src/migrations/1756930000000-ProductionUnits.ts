import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductionUnits1756930000000 implements MigrationInterface {
  name = 'ProductionUnits1756930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS production_units (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL,
        branch_id uuid NOT NULL,
        code character varying(50) NOT NULL,
        name character varying(255) NOT NULL,
        default_input_storage_id uuid,
        is_active boolean NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_production_units" PRIMARY KEY (id)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_production_units_company_id"
      ON production_units (company_id);
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_production_units_company_branch_code"
      ON production_units (company_id, branch_id, code);
    `);
    const fkBranch: Array<{ exists: boolean }> = await queryRunner.query(
      `SELECT EXISTS (
         SELECT 1
         FROM pg_constraint c
         JOIN pg_class t ON t.oid = c.conrelid
         JOIN pg_namespace n ON n.oid = t.relnamespace
         WHERE n.nspname = current_schema()
           AND t.relname = 'production_units'
           AND c.conname = 'FK_production_units_branch'
           AND c.contype = 'f'
       ) AS exists`,
    );
    if (!fkBranch[0]?.exists) {
      await queryRunner.query(`
        ALTER TABLE production_units
        ADD CONSTRAINT "FK_production_units_branch"
        FOREIGN KEY (branch_id) REFERENCES branches(id)
        ON DELETE RESTRICT ON UPDATE NO ACTION;
      `);
    }
    const fkStorage: Array<{ exists: boolean }> = await queryRunner.query(
      `SELECT EXISTS (
         SELECT 1
         FROM pg_constraint c
         JOIN pg_class t ON t.oid = c.conrelid
         JOIN pg_namespace n ON n.oid = t.relnamespace
         WHERE n.nspname = current_schema()
           AND t.relname = 'production_units'
           AND c.conname = 'FK_production_units_default_input_storage'
           AND c.contype = 'f'
       ) AS exists`,
    );
    if (!fkStorage[0]?.exists) {
      await queryRunner.query(`
        ALTER TABLE production_units
        ADD CONSTRAINT "FK_production_units_default_input_storage"
        FOREIGN KEY (default_input_storage_id) REFERENCES storages(id)
        ON DELETE SET NULL ON UPDATE NO ACTION;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE production_units DROP CONSTRAINT IF EXISTS "FK_production_units_default_input_storage";`,
    );
    await queryRunner.query(
      `ALTER TABLE production_units DROP CONSTRAINT IF EXISTS "FK_production_units_branch";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_production_units_company_branch_code";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_production_units_company_id";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS production_units;`);
  }
}
