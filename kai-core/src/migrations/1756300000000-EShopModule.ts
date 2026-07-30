import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tabla de testimonios eShop y flag de catálogo en variantes.
 */
export class EShopModule1756300000000 implements MigrationInterface {
  name = 'EShopModule1756300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_e_shop_testimonials_company_id"
      ON "e_shop_testimonials" ("company_id");
    `);

    await queryRunner.query(`
      ALTER TABLE "product_variants"
      ADD COLUMN IF NOT EXISTS "visible_in_e_shop" boolean NOT NULL DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "product_variants"
      DROP COLUMN IF EXISTS "visible_in_e_shop";
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "e_shop_testimonials";`);
  }
}
