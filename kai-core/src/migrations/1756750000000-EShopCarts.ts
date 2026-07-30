import { MigrationInterface, QueryRunner } from 'typeorm';

export class EShopCarts1756750000000 implements MigrationInterface {
  name = 'EShopCarts1756750000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "e_shop_carts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "cart_token" uuid NOT NULL,
        "customer_id" uuid,
        "status" character varying(32) NOT NULL DEFAULT 'active',
        "locked_at" TIMESTAMPTZ,
        "locked_reason" character varying(120),
        "expires_at" TIMESTAMPTZ NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "checkout_attempt_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_e_shop_carts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_e_shop_carts_cart_token" UNIQUE ("cart_token")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_e_shop_carts_company_customer"
      ON "e_shop_carts" ("company_id", "customer_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_e_shop_carts_expires_at"
      ON "e_shop_carts" ("expires_at");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "e_shop_cart_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "cart_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "product_variant_id" uuid NOT NULL,
        "quantity" numeric(12,3) NOT NULL DEFAULT 1,
        "unit_price_snapshot" numeric(15,2) NOT NULL,
        "product_name_snapshot" character varying(255) NOT NULL,
        "variant_name_snapshot" character varying(255) NOT NULL,
        "image_url_snapshot" text,
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_e_shop_cart_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_e_shop_cart_items_cart" FOREIGN KEY ("cart_id")
          REFERENCES "e_shop_carts"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_e_shop_cart_items_cart_variant"
      ON "e_shop_cart_items" ("cart_id", "product_variant_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "e_shop_cart_items";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "e_shop_carts";`);
  }
}
