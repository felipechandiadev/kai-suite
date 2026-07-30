import { MigrationInterface, QueryRunner } from 'typeorm';

export class FiscalDteEmissionAsync1756700000000 implements MigrationInterface {
  name = 'FiscalDteEmissionAsync1756700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "fiscal_dte_emissions"
      ADD COLUMN IF NOT EXISTS "encrypted_signed_envio" text,
      ADD COLUMN IF NOT EXISTS "signed_envio_iv" character varying(32),
      ADD COLUMN IF NOT EXISTS "submit_attempts" smallint NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "poll_attempts" smallint NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "next_retry_at" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "submitted_at" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "processing_claimed_at" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "sii_poll_after" TIMESTAMP WITH TIME ZONE;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_fiscal_dte_emissions_worker"
      ON "fiscal_dte_emissions" ("envio_status", "next_retry_at")
      WHERE "envio_status" IN ('PENDING', 'FAILED', 'SENT');
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_fiscal_dte_emissions_stale_sending"
      ON "fiscal_dte_emissions" ("processing_claimed_at")
      WHERE "envio_status" = 'SENDING';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_fiscal_dte_emissions_stale_sending";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_fiscal_dte_emissions_worker";`);
    await queryRunner.query(`
      ALTER TABLE "fiscal_dte_emissions"
      DROP COLUMN IF EXISTS "sii_poll_after",
      DROP COLUMN IF EXISTS "processing_claimed_at",
      DROP COLUMN IF EXISTS "submitted_at",
      DROP COLUMN IF EXISTS "next_retry_at",
      DROP COLUMN IF EXISTS "poll_attempts",
      DROP COLUMN IF EXISTS "submit_attempts",
      DROP COLUMN IF EXISTS "signed_envio_iv",
      DROP COLUMN IF EXISTS "encrypted_signed_envio";
    `);
  }
}
