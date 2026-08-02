import { MigrationInterface, QueryRunner } from 'typeorm';

/** Carta pública / POS cuentas / mesero: productos visibles en menú (KaiFood). */
export class ProductOnMenu1757630000000 implements MigrationInterface {
  name = 'ProductOnMenu1757630000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "on_menu" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products" DROP COLUMN IF EXISTS "on_menu"
    `);
  }
}
