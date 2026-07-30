import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lista de precios del sistema (p. ej. eShop) no eliminable.
 */
export class PriceListNonDeletable1756450000000 implements MigrationInterface {
  name = 'PriceListNonDeletable1756450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "price_lists"
      ADD COLUMN IF NOT EXISTS "non_deletable" boolean NOT NULL DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "price_lists"
      DROP COLUMN IF EXISTS "non_deletable";
    `);
  }
}
