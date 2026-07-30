import { MigrationInterface, QueryRunner } from 'typeorm';

export class EShopHeroSlideTextColor1756420000000 implements MigrationInterface {
  name = 'EShopHeroSlideTextColor1756420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "e_shop_hero_slides"
      ADD COLUMN IF NOT EXISTS "text_color" character varying(7);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "e_shop_hero_slides"
      DROP COLUMN IF EXISTS "text_color";
    `);
  }
}
