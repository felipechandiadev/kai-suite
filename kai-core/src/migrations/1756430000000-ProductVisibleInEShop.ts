import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Flag de catálogo eShop a nivel producto (complementa `product_variants.visible_in_e_shop`).
 */
export class ProductVisibleInEShop1756430000000 implements MigrationInterface {
  name = 'ProductVisibleInEShop1756430000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "visible_in_e_shop" boolean NOT NULL DEFAULT false;
    `);
    await queryRunner.query(`
      UPDATE "products" p
      SET "visible_in_e_shop" = true
      WHERE EXISTS (
        SELECT 1
        FROM "product_variants" v
        WHERE v."productId" = p.id
          AND v."visible_in_e_shop" = true
          AND v."deletedAt" IS NULL
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      DROP COLUMN IF EXISTS "visible_in_e_shop";
    `);
  }
}
