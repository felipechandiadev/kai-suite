import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Métodos de entrega eShop y política de stock en companies.settings.
 */
export class EShopFulfillmentMethods1756510000000 implements MigrationInterface {
  name = 'EShopFulfillmentMethods1756510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "e_shop_fulfillment_methods" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "code" character varying(64) NOT NULL,
        "name" character varying(120) NOT NULL,
        "description" text,
        "type" character varying(32) NOT NULL,
        "price_flat" numeric(15,2),
        "free_shipping_threshold" numeric(15,2),
        "estimated_days_min" integer,
        "estimated_days_max" integer,
        "requires_address" boolean NOT NULL DEFAULT false,
        "requires_phone" boolean NOT NULL DEFAULT false,
        "instructions" text,
        "pickup_branch_id" uuid,
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_e_shop_fulfillment_methods" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_e_shop_fulfillment_methods_company_code" UNIQUE ("company_id", "code")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_e_shop_fulfillment_methods_company_id"
      ON "e_shop_fulfillment_methods" ("company_id");
    `);

    // Métodos default para empresas con eShop habilitado
    await queryRunner.query(`
      INSERT INTO "e_shop_fulfillment_methods" (
        "company_id", "code", "name", "description", "type",
        "requires_address", "requires_phone", "instructions",
        "is_active", "sort_order"
      )
      SELECT
        c.id,
        'pickup',
        'Retiro en tienda',
        'Retira tu pedido en nuestra boutique',
        'PICKUP',
        false,
        false,
        'Te avisaremos cuando tu pedido esté listo para retiro.',
        true,
        0
      FROM companies c
      WHERE COALESCE((c.settings->>'eShopEnabled')::boolean, false) = true
        AND NOT EXISTS (
          SELECT 1 FROM e_shop_fulfillment_methods m
          WHERE m.company_id = c.id AND m.code = 'pickup'
        );
    `);
    await queryRunner.query(`
      INSERT INTO "e_shop_fulfillment_methods" (
        "company_id", "code", "name", "description", "type",
        "requires_address", "requires_phone", "instructions",
        "is_active", "sort_order"
      )
      SELECT
        c.id,
        'coordinate',
        'Envío a coordinar',
        'Coordinamos el envío contigo tras confirmar el pedido',
        'MANUAL_QUOTE',
        true,
        true,
        'Nos contactaremos para acordar dirección y costo de envío.',
        true,
        1
      FROM companies c
      WHERE COALESCE((c.settings->>'eShopEnabled')::boolean, false) = true
        AND NOT EXISTS (
          SELECT 1 FROM e_shop_fulfillment_methods m
          WHERE m.company_id = c.id AND m.code = 'coordinate'
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "e_shop_fulfillment_methods";`);
  }
}
