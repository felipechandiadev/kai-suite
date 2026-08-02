import { MigrationInterface, QueryRunner } from 'typeorm';

export class MenuHeroSlides1757640000000 implements MigrationInterface {
  name = 'MenuHeroSlides1757640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "menu_hero_slides" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "title" varchar(200),
        "subtitle" text,
        "cta_label" varchar(80),
        "cta_href" varchar(500),
        "cta_style" varchar(10) NOT NULL DEFAULT 'none',
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" int NOT NULL DEFAULT 0,
        "text_align" varchar(10) NOT NULL DEFAULT 'left',
        "overlay_opacity" smallint NOT NULL DEFAULT 45,
        "text_color" varchar(7),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_menu_hero_slides" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_menu_hero_slides_company_id"
      ON "menu_hero_slides" ("company_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "menu_hero_slides"`);
  }
}
