import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentGatewayIntentMpOrderIdIndex1756550000000
  implements MigrationInterface
{
  name = 'PaymentGatewayIntentMpOrderIdIndex1756550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payment_gateway_intents_mp_order_id"
      ON "payment_gateway_intents" ("mp_order_id")
      WHERE "mp_order_id" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_payment_gateway_intents_mp_order_id";
    `);
  }
}
