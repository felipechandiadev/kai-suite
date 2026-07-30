import { MigrationInterface, QueryRunner } from 'typeorm';

export class EShopHeroSlideCtaStyle1756410000000 implements MigrationInterface {
  name = 'EShopHeroSlideCtaStyle1756410000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "e_shop_hero_slides"
      ADD COLUMN IF NOT EXISTS "cta_style" character varying(10) NOT NULL DEFAULT 'none';
    `);
    await queryRunner.query(`
      UPDATE "e_shop_hero_slides"
      SET "cta_style" = 'button'
      WHERE "cta_label" IS NOT NULL AND TRIM("cta_label") <> '';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "e_shop_hero_slides"
      DROP COLUMN IF EXISTS "cta_style";
    `);
  }
}
