import { DataSource } from 'typeorm';

/** Tablas en `public` que no deben truncarse (extensiones PostGIS u otras). */
export const TRUNCATE_EXCLUDE_TABLES = new Set([
  'spatial_ref_sys',
  'geometry_columns',
  'geography_columns',
  'raster_columns',
  'raster_overviews',
]);

/**
 * Vacía todas las tablas del esquema `public` (reinicia secuencias).
 * Usar solo en entornos de desarrollo con seeds.
 */
export async function truncateAllPublicTables(dataSource: DataSource): Promise<void> {
  const schema = 'public';
  const rows = await dataSource.query<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY tablename`,
    [schema],
  );
  const names = rows
    .map((r) => r.tablename)
    .filter((t) => !TRUNCATE_EXCLUDE_TABLES.has(t));
  if (names.length === 0) {
    console.log(`⚠️  No hay tablas para truncar en ${schema}.`);
    return;
  }
  const quoted = names.map((n) => `"${n.replace(/"/g, '""')}"`).join(', ');
  await dataSource.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
  console.log(
    `✅ Base de datos limpiada: ${names.length} tabla(s) en «${schema}» (TRUNCATE … CASCADE).`,
  );
}

export async function ensureProductVariantUomTripletColumns(
  dataSource: DataSource,
): Promise<void> {
  const rows = await dataSource.query<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'product_variants'
       AND column_name IN ('stock_base_unit_id', 'sale_unit_id', 'purchase_unit_id')`,
  );
  if (rows.length < 3) {
    console.log(
      '⚙️  Aplicando columnas UoM en product_variants (stock / venta / compra)…',
    );
    await dataSource.query(`
    ALTER TABLE "product_variants"
      ADD COLUMN IF NOT EXISTS "stock_base_unit_id" uuid,
      ADD COLUMN IF NOT EXISTS "sale_unit_id" uuid,
      ADD COLUMN IF NOT EXISTS "purchase_unit_id" uuid
  `);
    await dataSource.query(`
    UPDATE "product_variants"
    SET
      "stock_base_unit_id" = COALESCE("stock_base_unit_id", "unit_id"),
      "sale_unit_id" = COALESCE("sale_unit_id", "unit_id"),
      "purchase_unit_id" = COALESCE("purchase_unit_id", "unit_id")
    WHERE "stock_base_unit_id" IS NULL
       OR "sale_unit_id" IS NULL
       OR "purchase_unit_id" IS NULL
  `);
    await dataSource.query(`
    ALTER TABLE "product_variants"
      ALTER COLUMN "stock_base_unit_id" SET NOT NULL,
      ALTER COLUMN "sale_unit_id" SET NOT NULL,
      ALTER COLUMN "purchase_unit_id" SET NOT NULL
  `);
  }
  await dataSource.query(`
    DO $$ BEGIN
      ALTER TABLE "product_variants" ADD CONSTRAINT "FK_product_variants_stock_base_unit"
        FOREIGN KEY ("stock_base_unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await dataSource.query(`
    DO $$ BEGIN
      ALTER TABLE "product_variants" ADD CONSTRAINT "FK_product_variants_sale_unit"
        FOREIGN KEY ("sale_unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await dataSource.query(`
    DO $$ BEGIN
      ALTER TABLE "product_variants" ADD CONSTRAINT "FK_product_variants_purchase_unit"
        FOREIGN KEY ("purchase_unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  console.log('✅ Columnas y FKs UoM de product_variants verificadas.');
}

export async function ensurePointsOfSaleStorageColumn(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    ALTER TABLE "points_of_sale" ADD COLUMN IF NOT EXISTS "storage_id" uuid
  `);
  await dataSource.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_points_of_sale_storage'
      ) THEN
        ALTER TABLE "points_of_sale"
        ADD CONSTRAINT "fk_points_of_sale_storage"
        FOREIGN KEY ("storage_id") REFERENCES "storages"("id") ON DELETE SET NULL;
      END IF;
    END
    $$;
  `);
  console.log('✅ Columna points_of_sale.storage_id verificada.');
}

export async function ensureStockLevelThresholdColumns(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    ALTER TABLE "stock_levels"
    ADD COLUMN IF NOT EXISTS "minimum_stock" integer NULL
  `);
  await dataSource.query(`
    ALTER TABLE "stock_levels"
    ADD COLUMN IF NOT EXISTS "maximum_stock" integer NULL
  `);
  await dataSource.query(`
    ALTER TABLE "stock_levels"
    ADD COLUMN IF NOT EXISTS "reorder_point" integer NULL
  `);
  console.log('✅ Columnas stock_levels (umbrales por bodega) verificadas.');
}

export async function ensureProductVariantShippingColumns(
  dataSource: DataSource,
): Promise<void> {
  await dataSource.query(`
    ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS net_weight_kg numeric(14,6) NULL
  `);
  await dataSource.query(`
    ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS gross_weight_kg numeric(14,6) NULL
  `);
  await dataSource.query(`
    ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS package_length_cm numeric(12,3) NULL
  `);
  await dataSource.query(`
    ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS package_width_cm numeric(12,3) NULL
  `);
  await dataSource.query(`
    ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS package_height_cm numeric(12,3) NULL
  `);
  await dataSource.query(`
    ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS volumetric_divisor_k integer NULL
  `);
  console.log('✅ Columnas product_variants (logística / envío) verificadas.');
}

export async function ensureBrandsTableAndProductBrandId(
  dataSource: DataSource,
): Promise<void> {
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS brands (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL,
      name character varying(255) NOT NULL,
      description text,
      is_active boolean NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now(),
      deleted_at TIMESTAMP,
      CONSTRAINT "PK_brands" PRIMARY KEY (id)
    );
  `);
  await dataSource.query(`
    ALTER TABLE brands
    ALTER COLUMN id SET DEFAULT gen_random_uuid();
  `);
  await dataSource.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "uq_brands_company_name"
    ON brands (company_id, name)
    WHERE deleted_at IS NULL;
  `);
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS "idx_brands_company_id" ON brands (company_id);
  `);
  await dataSource.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS brand_id uuid;
  `);
  await dataSource.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FK_products_brand'
      ) THEN
        ALTER TABLE products
        ADD CONSTRAINT "FK_products_brand"
        FOREIGN KEY (brand_id) REFERENCES brands(id)
        ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS "idx_products_brand_id" ON products (brand_id);
  `);
  console.log('✅ Tabla brands y columna products.brand_id verificadas.');
}

export async function ensureSeedSchemaPatches(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS accounting_rule_lines (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "ruleId" uuid NOT NULL,
      side varchar(20) NOT NULL,
      "accountId" uuid NOT NULL,
      "amountMode" varchar(20) NOT NULL,
      "amountValue" numeric(15,2),
      "sortOrder" int NOT NULL DEFAULT 0,
      "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT fk_accounting_rule_lines_rule FOREIGN KEY ("ruleId") REFERENCES accounting_rules(id) ON DELETE CASCADE,
      CONSTRAINT fk_accounting_rule_lines_account FOREIGN KEY ("accountId") REFERENCES accounting_accounts(id) ON DELETE RESTRICT
    );
  `);
  await dataSource.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_accounting_rule_lines_rule_sort
    ON accounting_rule_lines ("ruleId", "sortOrder");
  `);
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS automation_rules (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "companyId" uuid NOT NULL,
      "eventType" varchar(60) NOT NULL,
      filters json,
      priority int NOT NULL DEFAULT 0,
      "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    );
  `);
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_automation_rules_company_event_active
    ON automation_rules ("companyId", "eventType", "isActive");
  `);
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS automation_actions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "ruleId" uuid NOT NULL,
      type varchar(80) NOT NULL,
      params json,
      "sortOrder" int NOT NULL DEFAULT 0,
      "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT fk_automation_actions_rule FOREIGN KEY ("ruleId") REFERENCES automation_rules(id) ON DELETE CASCADE
    );
  `);
  await dataSource.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_actions_rule_sort
    ON automation_actions ("ruleId", "sortOrder");
  `);
  await dataSource.query(
    `ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS "pmpHistory" json`,
  );
  await dataSource.query(
    `ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS "salePriceHistory" json`,
  );
  await dataSource.query(`ALTER TABLE product_variants ALTER COLUMN pmp DROP DEFAULT`);
  await dataSource.query(
    `ALTER TABLE product_variants ALTER COLUMN pmp DROP NOT NULL`,
  );
}

export async function runSeedBootstrapGuards(dataSource: DataSource): Promise<void> {
  await ensureSeedSchemaPatches(dataSource);
  if (process.env.SEED_SKIP_TRUNCATE === 'true') {
    console.log(
      '⚠️  SEED_SKIP_TRUNCATE=true — no se truncan tablas (datos previos se mezclan con el seed).',
    );
  } else {
    console.log('🧹 Limpiando todas las tablas (schema public) antes del seed…');
    await truncateAllPublicTables(dataSource);
  }
  await ensureProductVariantUomTripletColumns(dataSource);
  await ensurePointsOfSaleStorageColumn(dataSource);
  await ensureStockLevelThresholdColumns(dataSource);
  await ensureProductVariantShippingColumns(dataSource);
  await ensureBrandsTableAndProductBrandId(dataSource);
}
