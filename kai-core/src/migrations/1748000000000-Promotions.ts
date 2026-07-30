import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sistema de promociones / descuentos:
 *  - Enums `promotions_type_enum`, `promotions_activation_enum`,
 *    `promotions_authorization_enum`, `promotion_scope_mode_enum`.
 *  - Tabla `promotions` con índices.
 *  - 7 tablas pivote `promotion_scope_*` (branches, pos, products,
 *    variants, categories, customers, payment_methods).
 *  - Tabla `promotion_redemptions` (registros inmutables de aplicación).
 */
export class Promotions1748000000000 implements MigrationInterface {
  name = 'Promotions1748000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enums
    await queryRunner.query(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promotions_type_enum') THEN
           CREATE TYPE promotions_type_enum AS ENUM (
             'PERCENT_ON_LINE', 'AMOUNT_ON_LINE', 'PERCENT_ON_ORDER',
             'AMOUNT_ON_ORDER', 'PRICE_OVERRIDE', 'BUY_X_GET_Y'
           );
         END IF;
       END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promotions_activation_enum') THEN
           CREATE TYPE promotions_activation_enum AS ENUM ('AUTO', 'MANUAL', 'CODE_ENTRY');
         END IF;
       END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promotions_authorization_enum') THEN
           CREATE TYPE promotions_authorization_enum AS ENUM ('NONE', 'CASHIER', 'MANAGER_PIN');
         END IF;
       END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promotion_scope_mode_enum') THEN
           CREATE TYPE promotion_scope_mode_enum AS ENUM ('INCLUDE', 'EXCLUDE');
         END IF;
       END $$;`,
    );

    // 2. Tabla promotions
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS promotions (
         id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
         company_id uuid NOT NULL,
         code varchar(64) NOT NULL,
         name varchar(200) NOT NULL,
         description text NULL,
         type promotions_type_enum NOT NULL,
         value numeric(19,4) NOT NULL DEFAULT 0,
         "maxValue" numeric(19,2) NULL,
         "isActive" boolean NOT NULL DEFAULT true,
         "validFrom" timestamp NULL,
         "validUntil" timestamp NULL,
         activation promotions_activation_enum NOT NULL DEFAULT 'AUTO',
         "redemptionCode" varchar(64) NULL,
         stackable boolean NOT NULL DEFAULT true,
         priority int NOT NULL DEFAULT 0,
         "minSubtotal" numeric(19,2) NULL,
         "minQuantity" int NULL,
         "daysOfWeek" int[] NULL,
         "hourFrom" time NULL,
         "hourTo" time NULL,
         "maxUsesTotal" int NULL,
         "maxUsesPerCustomer" int NULL,
         "usesCount" int NOT NULL DEFAULT 0,
        "authorization" promotions_authorization_enum NOT NULL DEFAULT 'NONE',
        "authorizationLimitPct" numeric(5,2) NULL,
         "buyQuantity" int NULL,
         "getQuantity" int NULL,
         "getDiscountPercent" numeric(5,2) NULL,
         "preloadOnPaymentScreen" boolean NOT NULL DEFAULT false,
         "displayOrder" int NOT NULL DEFAULT 0,
         "accountingTag" varchar(64) NULL,
         "createdBy" uuid NULL,
         "updatedBy" uuid NULL,
         "createdAt" timestamp NOT NULL DEFAULT now(),
         "updatedAt" timestamp NOT NULL DEFAULT now(),
         "deletedAt" timestamp NULL,
         CONSTRAINT fk_promotions_company FOREIGN KEY (company_id)
           REFERENCES companies(id) ON DELETE RESTRICT
       );`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_promotions_company_id ON promotions(company_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_promotions_company_active_until
         ON promotions(company_id, "isActive", "validUntil");`,
    );
    // Unicidad de `code` por empresa (ignorando borrados lógicos).
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_promotions_company_code_active
         ON promotions(company_id, code)
         WHERE "deletedAt" IS NULL;`,
    );
    // Unicidad de `redemptionCode` por empresa para cupones activos.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_promotions_company_redemption_code_active
         ON promotions(company_id, "redemptionCode")
         WHERE "deletedAt" IS NULL AND activation = 'CODE_ENTRY';`,
    );

    // 3. Tablas scope
    const scopeTables: { table: string; fkColumn: string; fkRefTable?: string }[] = [
      { table: 'promotion_scope_branches', fkColumn: 'branch_id', fkRefTable: 'branches' },
      { table: 'promotion_scope_pos', fkColumn: 'point_of_sale_id', fkRefTable: 'points_of_sale' },
      { table: 'promotion_scope_products', fkColumn: 'product_id', fkRefTable: 'products' },
      { table: 'promotion_scope_variants', fkColumn: 'product_variant_id', fkRefTable: 'product_variants' },
      { table: 'promotion_scope_categories', fkColumn: 'category_id', fkRefTable: 'categories' },
      { table: 'promotion_scope_customers', fkColumn: 'customer_id', fkRefTable: 'customers' },
      // payment_methods vive en jsonb; sin FK SQL
      { table: 'promotion_scope_payment_methods', fkColumn: 'company_payment_method_id' },
    ];

    for (const { table, fkColumn, fkRefTable } of scopeTables) {
      const fkClause = fkRefTable
        ? `, CONSTRAINT fk_${table}_target FOREIGN KEY (${fkColumn})
             REFERENCES ${fkRefTable}(id) ON DELETE CASCADE`
        : '';
      await queryRunner.query(
        `CREATE TABLE IF NOT EXISTS ${table} (
           id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
           promotion_id uuid NOT NULL,
           ${fkColumn} uuid NOT NULL,
           mode promotion_scope_mode_enum NOT NULL DEFAULT 'INCLUDE',
           CONSTRAINT fk_${table}_promotion FOREIGN KEY (promotion_id)
             REFERENCES promotions(id) ON DELETE CASCADE
           ${fkClause}
         );`,
      );
      await queryRunner.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS uq_${table}_promotion_target
           ON ${table}(promotion_id, ${fkColumn});`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS idx_${table}_target_promotion
           ON ${table}(${fkColumn}, promotion_id);`,
      );
    }

    // 4. Tabla promotion_redemptions
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS promotion_redemptions (
         id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
         company_id uuid NOT NULL,
         promotion_id uuid NOT NULL,
         transaction_id uuid NOT NULL,
         customer_id uuid NULL,
         amount_discounted numeric(19,2) NOT NULL,
         snapshot jsonb NOT NULL,
         applied_at timestamp NOT NULL DEFAULT now(),
         CONSTRAINT fk_promotion_redemptions_company FOREIGN KEY (company_id)
           REFERENCES companies(id) ON DELETE RESTRICT,
         CONSTRAINT fk_promotion_redemptions_promotion FOREIGN KEY (promotion_id)
           REFERENCES promotions(id) ON DELETE RESTRICT,
         CONSTRAINT fk_promotion_redemptions_transaction FOREIGN KEY (transaction_id)
           REFERENCES transactions(id) ON DELETE CASCADE,
         CONSTRAINT fk_promotion_redemptions_customer FOREIGN KEY (customer_id)
           REFERENCES customers(id) ON DELETE SET NULL
       );`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_company
         ON promotion_redemptions(company_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_promotion_applied
         ON promotion_redemptions(promotion_id, applied_at DESC);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_customer_promotion
         ON promotion_redemptions(customer_id, promotion_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_transaction
         ON promotion_redemptions(transaction_id);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS promotion_redemptions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS promotion_scope_payment_methods;`);
    await queryRunner.query(`DROP TABLE IF EXISTS promotion_scope_customers;`);
    await queryRunner.query(`DROP TABLE IF EXISTS promotion_scope_categories;`);
    await queryRunner.query(`DROP TABLE IF EXISTS promotion_scope_variants;`);
    await queryRunner.query(`DROP TABLE IF EXISTS promotion_scope_products;`);
    await queryRunner.query(`DROP TABLE IF EXISTS promotion_scope_pos;`);
    await queryRunner.query(`DROP TABLE IF EXISTS promotion_scope_branches;`);
    await queryRunner.query(`DROP TABLE IF EXISTS promotions;`);
    await queryRunner.query(`DROP TYPE IF EXISTS promotion_scope_mode_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS promotions_authorization_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS promotions_activation_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS promotions_type_enum;`);
  }
}
