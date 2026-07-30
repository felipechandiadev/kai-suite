import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Quién envió el fire a cocina (para notificar al mesero/cajero que lo disparó).
 */
export class DiningStationOrderSentByUser1757490000000
  implements MigrationInterface
{
  name = 'DiningStationOrderSentByUser1757490000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dining_station_orders"
      ADD COLUMN IF NOT EXISTS "sent_by_user_id" uuid NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_dining_station_orders_sent_by"
        ON "dining_station_orders" ("sent_by_user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_dining_station_orders_sent_by"
    `);
    await queryRunner.query(`
      ALTER TABLE "dining_station_orders"
      DROP COLUMN IF EXISTS "sent_by_user_id"
    `);
  }
}
