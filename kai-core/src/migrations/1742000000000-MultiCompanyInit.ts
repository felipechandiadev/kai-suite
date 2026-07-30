import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración multi-company:
 *
 *  - Asegura que exista al menos una company (crea "Empresa por defecto" si no hay).
 *  - Agrega company_id a todas las tablas operativas que no lo tienen.
 *  - Hace backfill con la primera company activa.
 *  - Marca company_id como NOT NULL (excepto users).
 *  - Crea FK + índice en cada caso.
 *  - users:
 *      ADMIN  → company_id = NULL
 *      OPERATOR → company_id = primera company activa
 *      CHECK constraint que enforza la regla.
 *
 * Tablas globales (sin company_id):
 *   companies, audits, health_metrics.
 *
 * Tablas que YA tienen company_id (no se tocan):
 *   branches, treasury_accounts, organizational_units, result_centers, taxes,
 *   automation_rules, account_balances, accounting_accounts, cash_hubs,
 *   operational_expenses, accounting_rules, employees, shareholders,
 *   expense_categories, accounting_periods, budgets.
 */
const TABLES_TO_TENANT = [
  // grupo C (catálogos del negocio)
  'persons',
  'customers',
  'suppliers',
  'products',
  'product_variants',
  'categories',
  'attributes',
  'units',
  'recipes',
  'recipe_lines',
  'price_lists',
  'price_list_items',
  'storages',
  'stock_levels',
  'multimedia_assets',
  'multimedia_links',
  'metal_prices',

  // grupo B (datos operativos transitivos – denormalizados para queries simples)
  'points_of_sale',
  'transactions',
  'transaction_lines',
  'document_sequences',
  'installments',
  'cash_sessions',
  'cash_deposits',
  'bank_movements',
  'bank_transfers',
  'bank_withdrawals',
  'receptions',
  'reception_lines',
  'automation_actions',
  'accounting_rule_lines',
  'ledger_entries',
  'accounting_period_snapshots',
  'capital_contributions',
  'remunerations',
];

export class MultiCompanyInit1742000000000 implements MigrationInterface {
  name = 'MultiCompanyInit1742000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Asegurar al menos una company.
    const existing: Array<{ id: string }> = await queryRunner.query(
      `SELECT id FROM companies WHERE "isActive" = true ORDER BY "createdAt" ASC LIMIT 1`,
    );
    let defaultCompanyId: string;
    if (existing.length > 0) {
      defaultCompanyId = existing[0].id;
    } else {
      /** RUT placeholder ≤14 chars (`companies.rut` es varchar(14)). */
      const autoRut = `T${Date.now().toString(36)}`.slice(0, 14).toUpperCase();
      const inserted: Array<{ id: string }> = await queryRunner.query(
        `INSERT INTO companies (razon_social, rut, "defaultCurrency", "isActive")
         VALUES ('Empresa por defecto', '${autoRut}', 'CLP', true)
         RETURNING id`,
      );
      defaultCompanyId = inserted[0].id;
    }

    // 2. Agregar company_id a cada tabla operativa.
    for (const table of TABLES_TO_TENANT) {
      const tableExists: Array<{ exists: boolean }> = await queryRunner.query(
        `SELECT EXISTS (
           SELECT FROM information_schema.tables
           WHERE table_schema = current_schema() AND table_name = $1
         ) AS exists`,
        [table],
      );
      if (!tableExists[0]?.exists) continue;

      const colExists: Array<{ exists: boolean }> = await queryRunner.query(
        `SELECT EXISTS (
           SELECT FROM information_schema.columns
           WHERE table_schema = current_schema()
             AND table_name = $1
             AND column_name = 'company_id'
         ) AS exists`,
        [table],
      );

      if (!colExists[0]?.exists) {
        await queryRunner.query(
          `ALTER TABLE "${table}" ADD COLUMN "company_id" uuid`,
        );
      }

      await queryRunner.query(
        `UPDATE "${table}" SET "company_id" = $1 WHERE "company_id" IS NULL`,
        [defaultCompanyId],
      );

      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "company_id" SET NOT NULL`,
      );

      const fkName = `fk_${table}_company`;
      const fkExists: Array<{ exists: boolean }> = await queryRunner.query(
        `SELECT EXISTS (
           SELECT FROM information_schema.table_constraints
           WHERE table_schema = current_schema()
             AND table_name = $1
             AND constraint_name = $2
         ) AS exists`,
        [table, fkName],
      );
      if (!fkExists[0]?.exists) {
        await queryRunner.query(
          `ALTER TABLE "${table}"
             ADD CONSTRAINT "${fkName}"
             FOREIGN KEY ("company_id") REFERENCES "companies"("id")
             ON DELETE RESTRICT`,
        );
      }

      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_${table}_company_id" ON "${table}" ("company_id")`,
      );
    }

    // 2.b Reemplazar uniques globales por uniques compuestos con company_id.
    //     Esto permite que dos companies tengan, p. ej., "Color" en attributes,
    //     o el mismo SKU en product_variants, etc.

    // attributes.name UNIQUE -> (companyId, name)
    await queryRunner.query(
      `ALTER TABLE "attributes" DROP CONSTRAINT IF EXISTS "UQ_attributes_name"`,
    );
    // El nombre real depende de cómo TypeORM lo creó; intentamos varios:
    const attrUniques: Array<{ conname: string }> = await queryRunner.query(
      `SELECT conname FROM pg_constraint WHERE conrelid = 'attributes'::regclass AND contype = 'u'`,
    );
    for (const u of attrUniques) {
      // Drop solo los uniques basados en (name) (los nuevos compuestos los crea TypeORM con prefijo IDX_)
      await queryRunner.query(
        `ALTER TABLE "attributes" DROP CONSTRAINT IF EXISTS "${u.conname}"`,
      );
    }
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_attributes_name_company"
       ON "attributes" ("name", "company_id")`,
    );

    // product_variants.sku UNIQUE -> (companyId, sku)
    const pvUniques: Array<{ conname: string }> = await queryRunner.query(
      `SELECT conname FROM pg_constraint WHERE conrelid = 'product_variants'::regclass AND contype = 'u'`,
    );
    for (const u of pvUniques) {
      await queryRunner.query(
        `ALTER TABLE "product_variants" DROP CONSTRAINT IF EXISTS "${u.conname}"`,
      );
    }
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_product_variants_sku_company"
       ON "product_variants" ("sku", "company_id")`,
    );

    // units.symbol UNIQUE -> (companyId, symbol)
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_units_symbol"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_units_symbol_company"
       ON "units" ("symbol", "company_id")`,
    );

    // 3. users: companyId nullable + CHECK + backfill.
    const usersExists: Array<{ exists: boolean }> = await queryRunner.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables
         WHERE table_schema = current_schema() AND table_name = 'users'
       ) AS exists`,
    );
    if (usersExists[0]?.exists) {
      const usersCol: Array<{ exists: boolean }> = await queryRunner.query(
        `SELECT EXISTS (
           SELECT FROM information_schema.columns
           WHERE table_schema = current_schema()
             AND table_name = 'users'
             AND column_name = 'company_id'
         ) AS exists`,
      );
      if (!usersCol[0]?.exists) {
        await queryRunner.query(
          `ALTER TABLE "users" ADD COLUMN "company_id" uuid`,
        );
      }

      /** Definición actual del CHECK (puede venir de synchronize o de 1749000000000). */
      const usersRoleCompanyChkDef: Array<{ def: string | null }> =
        await queryRunner.query(
          `SELECT pg_get_constraintdef(c.oid) AS def
           FROM pg_constraint c
           JOIN pg_class t ON t.oid = c.conrelid
           JOIN pg_namespace n ON n.oid = t.relnamespace
           WHERE n.nspname = current_schema()
             AND t.relname = 'users'
             AND c.conname = 'users_role_company_chk'
             AND c.contype = 'c'`,
        );
      const usesSuperAdminCompanyRule = (
        usersRoleCompanyChkDef[0]?.def ?? ''
      )
        .toUpperCase()
        .includes('SUPER_ADMIN');

      await queryRunner.query(
        `UPDATE "users" SET "company_id" = $1
           WHERE "rol" = 'OPERATOR' AND "company_id" IS NULL`,
        [defaultCompanyId],
      );

      if (usesSuperAdminCompanyRule) {
        // Misma regla que `User` + 1749000000000: ADMIN/OPERATOR con empresa; solo SUPER_ADMIN sin empresa.
        await queryRunner.query(
          `UPDATE "users" SET "company_id" = $1
             WHERE "rol" = 'ADMIN' AND "company_id" IS NULL`,
          [defaultCompanyId],
        );
      } else {
        // Modelo legacy antes de SUPER_ADMIN: admins "globales" con company_id NULL.
        await queryRunner.query(
          `UPDATE "users" SET "company_id" = NULL WHERE "rol" = 'ADMIN'`,
        );
      }

      const usersFk: Array<{ exists: boolean }> = await queryRunner.query(
        `SELECT EXISTS (
           SELECT FROM information_schema.table_constraints
           WHERE table_schema = current_schema()
             AND table_name = 'users'
             AND constraint_name = 'fk_users_company'
         ) AS exists`,
      );
      if (!usersFk[0]?.exists) {
        await queryRunner.query(
          `ALTER TABLE "users"
             ADD CONSTRAINT "fk_users_company"
             FOREIGN KEY ("company_id") REFERENCES "companies"("id")
             ON DELETE RESTRICT`,
        );
      }

      const usersChk: Array<{ exists: boolean }> = await queryRunner.query(
        `SELECT EXISTS (
           SELECT FROM information_schema.table_constraints
           WHERE table_schema = current_schema()
             AND table_name = 'users'
             AND constraint_name = 'users_role_company_chk'
         ) AS exists`,
      );
      if (!usersChk[0]?.exists) {
        await queryRunner.query(
          `ALTER TABLE "users"
             ADD CONSTRAINT "users_role_company_chk"
             CHECK ((rol = 'ADMIN' AND company_id IS NULL)
                 OR (rol = 'OPERATOR' AND company_id IS NOT NULL))`,
        );
      }

      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_users_company_id" ON "users" ("company_id")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir users
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_role_company_chk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "fk_users_company"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_company_id"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "company_id"`,
    );

    // Revertir resto
    for (const table of [...TABLES_TO_TENANT].reverse()) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "fk_${table}_company"`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "idx_${table}_company_id"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "company_id"`,
      );
    }
  }
}
