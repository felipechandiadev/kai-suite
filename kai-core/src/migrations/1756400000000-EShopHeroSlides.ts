import { MigrationInterface, QueryRunner } from 'typeorm';

export class EShopHeroSlides1756400000000 implements MigrationInterface {
  name = 'EShopHeroSlides1756400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_e_shop_hero_slides_company_id"
      ON "e_shop_hero_slides" ("company_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "e_shop_hero_slides";`);
  }
}
