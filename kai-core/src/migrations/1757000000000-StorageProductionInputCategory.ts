import { MigrationInterface, QueryRunner } from 'typeorm';

export class StorageProductionInputCategory1757000000000
  implements MigrationInterface
{
  name = 'StorageProductionInputCategory1757000000000';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    const meta: Array<{
      udt_name: string;
      column_name: string;
      is_enum: boolean;
    }> = await queryRunner.query(`
      SELECT c.udt_name, c.column_name,
        EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = c.udt_name
            AND n.nspname = 'public'
            AND t.typtype = 'e'
        ) AS is_enum
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = 'storages'
        AND lower(c.column_name) = 'category'
      LIMIT 1
    `);

    const m = meta[0];
    if (m?.is_enum && m.udt_name) {
      const udtQ = `"${m.udt_name.replace(/"/g, '')}"`;
      await queryRunner.query(
        `ALTER TYPE public.${udtQ} ADD VALUE IF NOT EXISTS 'PRODUCTION_INPUT'`,
      );
    }

    await queryRunner.query(`
      UPDATE production_units pu
      SET default_output_storage_id = pu.default_input_storage_id
      WHERE pu.default_output_storage_id IS NULL
        AND pu.default_input_storage_id IS NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE storages
      ADD COLUMN IF NOT EXISTS production_unit_id uuid;
    `);

    const fkExists: Array<{ exists: boolean }> = await queryRunner.query(
      `SELECT EXISTS (
         SELECT 1
         FROM pg_constraint c
         JOIN pg_class t ON t.oid = c.conrelid
         JOIN pg_namespace n ON n.oid = t.relnamespace
         WHERE n.nspname = current_schema()
           AND t.relname = 'storages'
           AND c.conname = 'FK_storages_production_unit'
           AND c.contype = 'f'
       ) AS exists`,
    );
    if (!fkExists[0]?.exists) {
      await queryRunner.query(`
        ALTER TABLE storages
        ADD CONSTRAINT "FK_storages_production_unit"
        FOREIGN KEY (production_unit_id) REFERENCES production_units(id)
        ON DELETE SET NULL ON UPDATE NO ACTION;
      `);
    }

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_storages_production_unit_id"
      ON storages (production_unit_id)
      WHERE production_unit_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_storages_production_unit_id";`,
    );
    await queryRunner.query(
      `ALTER TABLE storages DROP CONSTRAINT IF EXISTS "FK_storages_production_unit";`,
    );
    await queryRunner.query(
      `ALTER TABLE storages DROP COLUMN IF EXISTS production_unit_id;`,
    );
  }
}
