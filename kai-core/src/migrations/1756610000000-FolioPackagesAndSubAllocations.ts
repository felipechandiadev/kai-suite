import { MigrationInterface, QueryRunner } from 'typeorm';

export class FolioPackagesAndSubAllocations1756610000000 implements MigrationInterface {
  name = 'FolioPackagesAndSubAllocations1756610000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "fiscal_cafs"
      ADD COLUMN IF NOT EXISTS "package_code" character varying(64),
      ADD COLUMN IF NOT EXISTS "label" character varying(120),
      ADD COLUMN IF NOT EXISTS "status" character varying(32) NOT NULL DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS "source" character varying(32) NOT NULL DEFAULT 'manual_upload';
    `);

    await queryRunner.query(`
      UPDATE "fiscal_cafs"
      SET "package_code" = 'FOL-' || "dte_type"::text || '-' || UPPER(SUBSTRING("id"::text, 1, 8))
      WHERE "package_code" IS NULL OR TRIM("package_code") = '';
    `);

    await queryRunner.query(`
      ALTER TABLE "fiscal_cafs"
      ALTER COLUMN "package_code" SET NOT NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_fiscal_caf_company_package_code"
      ON "fiscal_cafs" ("company_id", "package_code");
    `);

    await queryRunner.query(`
      UPDATE "fiscal_cafs"
      SET "status" = CASE WHEN "is_active" = true THEN 'active' ELSE 'archived' END
      WHERE "status" IS NULL OR "status" = '';
    `);

    await queryRunner.query(`
      ALTER TABLE "point_of_sale_folio_allocations"
      ADD COLUMN IF NOT EXISTS "caf_id" uuid,
      ADD COLUMN IF NOT EXISTS "sub_pack_code" character varying(64),
      ADD COLUMN IF NOT EXISTS "label" character varying(120);
    `);

    await queryRunner.query(`
      UPDATE "point_of_sale_folio_allocations" a
      SET "caf_id" = c."id"
      FROM "fiscal_cafs" c
      WHERE a."caf_id" IS NULL
        AND c."company_id" = a."company_id"
        AND c."dte_type" = a."dte_type"
        AND c."environment" = a."environment"
        AND c."is_active" = true;
    `);

    await queryRunner.query(`
      UPDATE "point_of_sale_folio_allocations"
      SET "sub_pack_code" = 'SUB-' || UPPER(SUBSTRING("id"::text, 1, 8))
      WHERE "sub_pack_code" IS NULL OR TRIM("sub_pack_code") = '';
    `);

    await queryRunner.query(`
      ALTER TABLE "point_of_sale_folio_allocations"
      ALTER COLUMN "caf_id" SET NOT NULL,
      ALTER COLUMN "sub_pack_code" SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "point_of_sale_folio_allocations"
      ADD CONSTRAINT "FK_pos_folio_alloc_caf"
      FOREIGN KEY ("caf_id") REFERENCES "fiscal_cafs"("id") ON DELETE RESTRICT;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_pos_folio_alloc_caf"
      ON "point_of_sale_folio_allocations" ("caf_id");
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_pos_folio_alloc_company_sub_pack"
      ON "point_of_sale_folio_allocations" ("company_id", "sub_pack_code");
    `);

    await queryRunner.query(`
      ALTER TABLE "fiscal_dte_emissions"
      ADD COLUMN IF NOT EXISTS "caf_id" uuid,
      ADD COLUMN IF NOT EXISTS "allocation_id" uuid;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_fiscal_dte_emissions_caf"
      ON "fiscal_dte_emissions" ("caf_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_fiscal_dte_emissions_allocation"
      ON "fiscal_dte_emissions" ("allocation_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_fiscal_dte_emissions_allocation";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_fiscal_dte_emissions_caf";`);
    await queryRunner.query(`
      ALTER TABLE "fiscal_dte_emissions"
      DROP COLUMN IF EXISTS "allocation_id",
      DROP COLUMN IF EXISTS "caf_id";
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "uq_pos_folio_alloc_company_sub_pack";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_pos_folio_alloc_caf";`);
    await queryRunner.query(`
      ALTER TABLE "point_of_sale_folio_allocations"
      DROP CONSTRAINT IF EXISTS "FK_pos_folio_alloc_caf";
    `);
    await queryRunner.query(`
      ALTER TABLE "point_of_sale_folio_allocations"
      DROP COLUMN IF EXISTS "label",
      DROP COLUMN IF EXISTS "sub_pack_code",
      DROP COLUMN IF EXISTS "caf_id";
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "uq_fiscal_caf_company_package_code";`);
    await queryRunner.query(`
      ALTER TABLE "fiscal_cafs"
      DROP COLUMN IF EXISTS "source",
      DROP COLUMN IF EXISTS "status",
      DROP COLUMN IF EXISTS "label",
      DROP COLUMN IF EXISTS "package_code";
    `);
  }
}
