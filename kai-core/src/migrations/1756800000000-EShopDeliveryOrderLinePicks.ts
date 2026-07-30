import { MigrationInterface, QueryRunner } from 'typeorm';

export class EShopDeliveryOrderLinePicks1756800000000 implements MigrationInterface {
  name = 'EShopDeliveryOrderLinePicks1756800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "e_shop_delivery_order_line_picks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "delivery_order_id" uuid NOT NULL,
        "transaction_line_id" uuid NOT NULL,
        "is_picked" boolean NOT NULL DEFAULT false,
        "picked_at" timestamptz,
        "picked_by_user_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_e_shop_delivery_order_line_picks" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_e_shop_delivery_order_line_picks"
      ON "e_shop_delivery_order_line_picks" ("company_id", "delivery_order_id", "transaction_line_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_e_shop_delivery_order_line_picks_order"
      ON "e_shop_delivery_order_line_picks" ("company_id", "delivery_order_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_e_shop_delivery_order_line_picks_order"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_e_shop_delivery_order_line_picks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "e_shop_delivery_order_line_picks"`);
  }
}
