import { MigrationInterface, QueryRunner } from 'typeorm';

export class FiscalDteEmissions1756590000000 implements MigrationInterface {
  name = 'FiscalDteEmissions1756590000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fiscal_dte_emissions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "transaction_id" uuid NOT NULL,
        "dte_type" smallint NOT NULL DEFAULT 39,
        "folio" integer NOT NULL,
        "environment" character varying(32) NOT NULL,
        "receptor_rut" character varying(14) NOT NULL,
        "receptor_name" character varying(120) NOT NULL,
        "track_id" character varying(64),
        "envio_status" character varying(16) NOT NULL,
        "ted_xml" text,
        "error_detail" jsonb,
        "issued_at" date NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fiscal_dte_emissions" PRIMARY KEY ("id"),
        CONSTRAINT "uq_fiscal_dte_emissions_transaction" UNIQUE ("transaction_id"),
        CONSTRAINT "FK_fiscal_dte_emissions_company" FOREIGN KEY ("company_id")
          REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_fiscal_dte_emissions_transaction" FOREIGN KEY ("transaction_id")
          REFERENCES "transactions"("id") ON DELETE RESTRICT
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_fiscal_dte_emissions_company"
      ON "fiscal_dte_emissions" ("company_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "fiscal_dte_emissions";`);
  }
}
