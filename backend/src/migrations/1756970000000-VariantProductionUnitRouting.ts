import { MigrationInterface, QueryRunner } from 'typeorm';

export class VariantProductionUnitRouting1756970000000
  implements MigrationInterface
{
  name = 'VariantProductionUnitRouting1756970000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_variant_production_units (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL,
        product_variant_id uuid NOT NULL,
        branch_id uuid NOT NULL,
        production_unit_id uuid NOT NULL,
        is_default boolean NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_variant_production_units" PRIMARY KEY (id)
      );
    `);

    // Upgrade from earlier 1:1 draft if the table already existed without is_default.
    await queryRunner.query(`
      ALTER TABLE product_variant_production_units
      ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "uq_pv_prod_units_variant_branch";
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_pv_prod_units_company_variant"
      ON product_variant_production_units (company_id, product_variant_id);
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_pv_prod_units_variant_branch_unit"
      ON product_variant_production_units (product_variant_id, branch_id, production_unit_id);
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_pv_prod_units_variant_branch_default"
      ON product_variant_production_units (product_variant_id, branch_id)
      WHERE is_default = true;
    `);

    const ensureFk = async (conname: string, sql: string): Promise<void> => {
      const rows: Array<{ exists: boolean }> = await queryRunner.query(
        `SELECT EXISTS (
           SELECT 1
           FROM pg_constraint c
           JOIN pg_class t ON t.oid = c.conrelid
           JOIN pg_namespace n ON n.oid = t.relnamespace
           WHERE n.nspname = current_schema()
             AND t.relname = 'product_variant_production_units'
             AND c.conname = $1
             AND c.contype = 'f'
         ) AS exists`,
        [conname],
      );
      if (!rows[0]?.exists) {
        await queryRunner.query(sql);
      }
    };

    await ensureFk(
      'FK_pv_prod_units_variant',
      `
        ALTER TABLE product_variant_production_units
        ADD CONSTRAINT "FK_pv_prod_units_variant"
        FOREIGN KEY (product_variant_id) REFERENCES product_variants(id)
        ON DELETE CASCADE ON UPDATE NO ACTION;
      `,
    );
    await ensureFk(
      'FK_pv_prod_units_branch',
      `
        ALTER TABLE product_variant_production_units
        ADD CONSTRAINT "FK_pv_prod_units_branch"
        FOREIGN KEY (branch_id) REFERENCES branches(id)
        ON DELETE RESTRICT ON UPDATE NO ACTION;
      `,
    );
    await ensureFk(
      'FK_pv_prod_units_unit',
      `
        ALTER TABLE product_variant_production_units
        ADD CONSTRAINT "FK_pv_prod_units_unit"
        FOREIGN KEY (production_unit_id) REFERENCES production_units(id)
        ON DELETE RESTRICT ON UPDATE NO ACTION;
      `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE product_variant_production_units DROP CONSTRAINT IF EXISTS "FK_pv_prod_units_unit";`,
    );
    await queryRunner.query(
      `ALTER TABLE product_variant_production_units DROP CONSTRAINT IF EXISTS "FK_pv_prod_units_branch";`,
    );
    await queryRunner.query(
      `ALTER TABLE product_variant_production_units DROP CONSTRAINT IF EXISTS "FK_pv_prod_units_variant";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_pv_prod_units_variant_branch_default";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_pv_prod_units_variant_branch_unit";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_pv_prod_units_company_variant";`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS product_variant_production_units;`,
    );
  }
}
