import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Catálogo de medios de pago por empresa + override por POS.
 * (La migración FeePercent 175733 asume que estas tablas ya existen;
 * en DBs nuevas / sync parcial pueden faltar.)
 */
export class CompanyPaymentCatalogTables1757460000000
  implements MigrationInterface
{
  name = 'CompanyPaymentCatalogTables1757460000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "company_voucher_kinds" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "code" character varying(32) NOT NULL,
        "name" character varying(255) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "face_value_mode" character varying(16) NOT NULL DEFAULT 'OPEN',
        "default_face_value" numeric(15,2),
        "require_face_value" boolean NOT NULL DEFAULT false,
        "default_issuer_name" character varying(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_company_voucher_kinds" PRIMARY KEY ("id"),
        CONSTRAINT "FK_company_voucher_kinds_company"
          FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_company_voucher_kinds_company"
        ON "company_voucher_kinds" ("company_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "company_payment_methods" (
        "id" uuid NOT NULL,
        "company_id" uuid NOT NULL,
        "method" character varying(40) NOT NULL,
        "alias" character varying(255),
        "display_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "require_reference" boolean NOT NULL DEFAULT false,
        "bank_account_key" character varying(120),
        "fee_percent" numeric(5,2),
        "metadata" jsonb,
        "voucher_kind_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_company_payment_methods" PRIMARY KEY ("id"),
        CONSTRAINT "FK_company_payment_methods_company"
          FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_company_payment_methods_voucher_kind"
          FOREIGN KEY ("voucher_kind_id") REFERENCES "company_voucher_kinds"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_company_payment_methods_company"
        ON "company_payment_methods" ("company_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pos_payment_methods" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "point_of_sale_id" uuid NOT NULL,
        "company_payment_method_id" uuid NOT NULL,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "preload_on_payment_screen" boolean NOT NULL DEFAULT false,
        "preload_order" integer,
        "is_default_for_change" boolean NOT NULL DEFAULT false,
        "bank_account_key" character varying(120),
        "require_reference" boolean,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pos_payment_methods" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_pos_payment_methods_pos_cmp"
          UNIQUE ("point_of_sale_id", "company_payment_method_id"),
        CONSTRAINT "FK_pos_payment_methods_pos"
          FOREIGN KEY ("point_of_sale_id") REFERENCES "points_of_sale"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_pos_payment_methods_company_method"
          FOREIGN KEY ("company_payment_method_id") REFERENCES "company_payment_methods"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_pos_payment_methods_pos"
        ON "pos_payment_methods" ("point_of_sale_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "pos_payment_methods"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "company_payment_methods"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "company_voucher_kinds"`);
  }
}
