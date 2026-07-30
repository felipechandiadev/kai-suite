import { MigrationInterface, QueryRunner } from 'typeorm';

export class EShopDeliveryOccurrenceKindAndEndTime1756810000000
  implements MigrationInterface
{
  name = 'EShopDeliveryOccurrenceKindAndEndTime1756810000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "e_shop_delivery_occurrences"
      ADD COLUMN IF NOT EXISTS "kind" varchar(32) NOT NULL DEFAULT 'LOCAL_DELIVERY'
    `);
    await queryRunner.query(`
      ALTER TABLE "e_shop_delivery_occurrences"
      ADD COLUMN IF NOT EXISTS "end_time" time
    `);
    await queryRunner.query(`
      UPDATE "e_shop_delivery_occurrences"
      SET "kind" = 'LOCAL_DELIVERY'
      WHERE "kind" IS NULL OR "kind" = ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "e_shop_delivery_occurrences"
      DROP COLUMN IF EXISTS "end_time"
    `);
    await queryRunner.query(`
      ALTER TABLE "e_shop_delivery_occurrences"
      DROP COLUMN IF EXISTS "kind"
    `);
  }
}
