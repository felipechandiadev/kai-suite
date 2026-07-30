import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Crea tablas/columnas eShop cuando no se ha corrido la migración (dev local).
 */
@Injectable()
export class EShopSchemaBootstrap implements OnModuleInit {
  private readonly logger = new Logger(EShopSchemaBootstrap.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "e_shop_testimonials" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "company_id" uuid NOT NULL,
          "client_name" character varying(120) NOT NULL,
          "rating" smallint NOT NULL,
          "message" text NOT NULL,
          "is_active" boolean NOT NULL DEFAULT true,
          "sort_order" integer NOT NULL DEFAULT 0,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_e_shop_testimonials" PRIMARY KEY ("id")
        );
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS "idx_e_shop_testimonials_company_id"
        ON "e_shop_testimonials" ("company_id");
      `);
      await this.dataSource.query(`
        ALTER TABLE "product_variants"
        ADD COLUMN IF NOT EXISTS "visible_in_e_shop" boolean NOT NULL DEFAULT false;
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "e_shop_hero_slides" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "company_id" uuid NOT NULL,
          "title" character varying(200),
          "subtitle" text,
          "cta_label" character varying(80),
          "cta_href" character varying(500),
          "is_active" boolean NOT NULL DEFAULT true,
          "sort_order" integer NOT NULL DEFAULT 0,
          "text_align" character varying(10) NOT NULL DEFAULT 'left',
          "overlay_opacity" smallint NOT NULL DEFAULT 45,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_e_shop_hero_slides" PRIMARY KEY ("id")
        );
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS "idx_e_shop_hero_slides_company_id"
        ON "e_shop_hero_slides" ("company_id");
      `);
      await this.dataSource.query(`
        ALTER TABLE "e_shop_hero_slides"
        ADD COLUMN IF NOT EXISTS "cta_style" character varying(10) NOT NULL DEFAULT 'none';
      `);
      await this.dataSource.query(`
        ALTER TABLE "e_shop_hero_slides"
        ADD COLUMN IF NOT EXISTS "text_color" character varying(7);
      `);
      await this.dataSource.query(`
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
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS "idx_e_shop_fulfillment_methods_company_id"
        ON "e_shop_fulfillment_methods" ("company_id");
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "eshop_customer_accounts" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "company_id" uuid NOT NULL,
          "customer_id" uuid NOT NULL,
          "email" character varying(255) NOT NULL,
          "password_hash" character varying(255) NOT NULL,
          "session_token" uuid,
          "email_verified_at" TIMESTAMP,
          "email_verification_token" character varying(64),
          "password_reset_token" character varying(64),
          "password_reset_expires_at" TIMESTAMP,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_eshop_customer_accounts" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_eshop_customer_accounts_company_email" UNIQUE ("company_id", "email")
        );
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS "idx_eshop_customer_accounts_customer_id"
        ON "eshop_customer_accounts" ("customer_id");
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS "idx_eshop_customer_accounts_session_token"
        ON "eshop_customer_accounts" ("session_token");
      `);
      await this.dataSource.query(`
        ALTER TABLE "eshop_customer_accounts"
        ADD COLUMN IF NOT EXISTS "username" character varying(30);
      `);
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "idx_eshop_customer_accounts_company_username"
        ON "eshop_customer_accounts" ("company_id", "username")
        WHERE "username" IS NOT NULL;
      `);
      await this.dataSource.query(`
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
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS "idx_e_shop_carts_company_customer"
        ON "e_shop_carts" ("company_id", "customer_id");
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS "idx_e_shop_carts_expires_at"
        ON "e_shop_carts" ("expires_at");
      `);
      await this.dataSource.query(`
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
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "uq_e_shop_cart_items_cart_variant"
        ON "e_shop_cart_items" ("cart_id", "product_variant_id");
      `);
      this.logger.log('eShop schema bootstrap OK');
    } catch (err) {
      this.logger.error(
        `eShop schema bootstrap failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
