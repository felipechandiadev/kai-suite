import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tipos PACK (kit retail) y AGREGADO (modificador KaiFood).
 * Tablas product_addons y dining_order_line_addons.
 * RecipeType.PACK en recipes_type_enum.
 */
export class ProductTypePackAgregado1757690000000 implements MigrationInterface {
  name = 'ProductTypePackAgregado1757690000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        udt text;
        is_enum boolean;
      BEGIN
        SELECT c.udt_name INTO udt
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'products'
          AND lower(c.column_name) IN ('producttype', 'product_type')
        LIMIT 1;

        IF udt IS NOT NULL THEN
          SELECT EXISTS (
            SELECT 1 FROM pg_type t
            JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE t.typname = udt AND n.nspname = 'public' AND t.typtype = 'e'
          ) INTO is_enum;
          IF is_enum THEN
            EXECUTE format('ALTER TYPE public.%I ADD VALUE IF NOT EXISTS %L', udt, 'PACK');
            EXECUTE format('ALTER TYPE public.%I ADD VALUE IF NOT EXISTS %L', udt, 'AGREGADO');
          END IF;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "recipes_type_enum" ADD VALUE IF NOT EXISTS 'PACK';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_addons (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL,
        host_product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        addon_product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        sort_order int NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_product_addons_host_addon UNIQUE (host_product_id, addon_product_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_product_addons_company_id
      ON product_addons (company_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_product_addons_host_product_id
      ON product_addons (host_product_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dining_order_line_addons (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        dining_order_line_id uuid NOT NULL REFERENCES dining_order_lines(id) ON DELETE CASCADE,
        addon_variant_id uuid NOT NULL,
        quantity numeric(12,3) NOT NULL DEFAULT 1,
        display_name varchar(255) NOT NULL,
        unit_price_snapshot numeric(15,2) NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dining_order_line_addons_line_id
      ON dining_order_line_addons (dining_order_line_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS dining_order_line_addons`);
    await queryRunner.query(`DROP TABLE IF EXISTS product_addons`);
  }
}
