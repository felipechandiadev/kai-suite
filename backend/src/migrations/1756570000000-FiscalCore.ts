import { MigrationInterface, QueryRunner } from 'typeorm';

export class FiscalCore1756570000000 implements MigrationInterface {
  name = 'FiscalCore1756570000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fiscal_profiles" (
        "company_id" uuid NOT NULL,
        "environment" character varying(32) NOT NULL DEFAULT 'certification',
        "status" character varying(48) NOT NULL DEFAULT 'DRAFT',
        "legal_name" character varying(255),
        "rut" character varying(14),
        "business_activity" character varying(255),
        "address" character varying(500),
        "commune" character varying(120),
        "city" character varying(120),
        "resolution_number" character varying(64),
        "resolution_date" date,
        "production_enabled" boolean NOT NULL DEFAULT false,
        "portal_postulation_done" boolean NOT NULL DEFAULT false,
        "portal_permissions_done" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fiscal_profiles" PRIMARY KEY ("company_id"),
        CONSTRAINT "FK_fiscal_profiles_company" FOREIGN KEY ("company_id")
          REFERENCES "companies"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fiscal_certificates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "subject_rut" character varying(14),
        "not_before" TIMESTAMPTZ,
        "not_after" TIMESTAMPTZ,
        "encrypted_pfx" bytea NOT NULL,
        "encrypted_password" bytea NOT NULL,
        "pfx_iv" character varying(32) NOT NULL,
        "password_iv" character varying(32) NOT NULL,
        "uploaded_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fiscal_certificates" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_fiscal_certificates_company"
      ON "fiscal_certificates" ("company_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fiscal_cafs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "dte_type" smallint NOT NULL DEFAULT 39,
        "range_from" integer NOT NULL,
        "range_to" integer NOT NULL,
        "next_folio" integer NOT NULL,
        "environment" character varying(32) NOT NULL DEFAULT 'certification',
        "is_active" boolean NOT NULL DEFAULT true,
        "encrypted_caf_xml" bytea NOT NULL,
        "caf_iv" character varying(32) NOT NULL,
        "uploaded_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fiscal_cafs" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_fiscal_cafs_company"
      ON "fiscal_cafs" ("company_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fiscal_certification_runs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "status" character varying(48) NOT NULL DEFAULT 'DRAFT',
        "folio_from" integer,
        "folio_to" integer,
        "boleta_track_id" character varying(64),
        "rco_track_id" character varying(64),
        "boleta_envio_status" character varying(16),
        "rco_envio_status" character varying(16),
        "generated_preview" jsonb,
        "error_detail" jsonb,
        "portal_validated" boolean NOT NULL DEFAULT false,
        "portal_declaration_done" boolean NOT NULL DEFAULT false,
        "started_at" TIMESTAMP NOT NULL DEFAULT now(),
        "completed_at" TIMESTAMPTZ,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fiscal_certification_runs" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_fiscal_cert_runs_company"
      ON "fiscal_certification_runs" ("company_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "fiscal_certification_runs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fiscal_cafs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fiscal_certificates";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fiscal_profiles";`);
  }
}
