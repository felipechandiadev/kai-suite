import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentGatewayIntents1756540000000 implements MigrationInterface {
  name = 'PaymentGatewayIntents1756540000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_gateway_intents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "channel" character varying(32) NOT NULL,
        "status" character varying(32) NOT NULL,
        "amount" integer NOT NULL,
        "currency" character varying(8) NOT NULL DEFAULT 'CLP',
        "mp_payment_id" character varying(64),
        "mp_order_id" character varying(64),
        "external_reference" character varying(200) NOT NULL,
        "idempotency_key" character varying(120) NOT NULL,
        "cash_session_id" uuid,
        "point_of_sale_id" uuid,
        "transaction_id" uuid,
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_gateway_intents" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payment_gateway_intents_external_reference" UNIQUE ("external_reference")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payment_gateway_intents_company_id"
      ON "payment_gateway_intents" ("company_id");
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_payment_gateway_intents_mp_payment_id"
      ON "payment_gateway_intents" ("mp_payment_id")
      WHERE "mp_payment_id" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_gateway_intents";`);
  }
}
