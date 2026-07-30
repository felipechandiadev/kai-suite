import { MigrationInterface, QueryRunner } from 'typeorm';

export class EShopCustomerAccounts1756520000000 implements MigrationInterface {
  name = 'EShopCustomerAccounts1756520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "eshop_customer_accounts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "email" character varying(255) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "session_token" uuid,
        "email_verified_at" TIMESTAMP,
        "email_verification_token" character varying(64),
        "password_reset_token" character varying(64),
        "password_reset_expires_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_eshop_customer_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_eshop_customer_accounts_company_email" UNIQUE ("company_id", "email")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_eshop_customer_accounts_customer_id"
      ON "eshop_customer_accounts" ("customer_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_eshop_customer_accounts_session_token"
      ON "eshop_customer_accounts" ("session_token");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "eshop_customer_accounts"`);
  }
}
