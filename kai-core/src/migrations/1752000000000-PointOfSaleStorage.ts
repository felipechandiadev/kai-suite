import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Vincula cada punto de venta al almacén tipo sala (STORE) donde se descuenta stock en POS.
 */
export class PointOfSaleStorage1752000000000 implements MigrationInterface {
  name = 'PointOfSaleStorage1752000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "points_of_sale" ADD COLUMN IF NOT EXISTS "storage_id" uuid
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_points_of_sale_storage'
        ) THEN
          ALTER TABLE "points_of_sale"
          ADD CONSTRAINT "fk_points_of_sale_storage"
          FOREIGN KEY ("storage_id") REFERENCES "storages"("id") ON DELETE SET NULL;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "points_of_sale" DROP CONSTRAINT IF EXISTS "fk_points_of_sale_storage"`,
    );
    await queryRunner.query(
      `ALTER TABLE "points_of_sale" DROP COLUMN IF EXISTS "storage_id"`,
    );
  }
}
