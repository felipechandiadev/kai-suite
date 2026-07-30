import { MigrationInterface, QueryRunner } from 'typeorm';

export class PosFiscalAllocations1756600000000 implements MigrationInterface {
  name = 'PosFiscalAllocations1756600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "point_of_sale_folio_allocations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "point_of_sale_id" uuid NOT NULL,
        "dte_type" smallint NOT NULL,
        "range_from" integer NOT NULL,
        "range_to" integer NOT NULL,
        "next_folio" integer NOT NULL,
        "environment" character varying(32) NOT NULL DEFAULT 'production',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_point_of_sale_folio_allocations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pos_folio_alloc_pos" FOREIGN KEY ("point_of_sale_id")
          REFERENCES "points_of_sale"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_pos_folio_alloc_pos_dte_env"
      ON "point_of_sale_folio_allocations" ("point_of_sale_id", "dte_type", "environment");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_pos_folio_alloc_company_dte"
      ON "point_of_sale_folio_allocations" ("company_id", "dte_type", "environment");
    `);

    await queryRunner.query(`
      ALTER TABLE "fiscal_dte_emissions"
      ADD COLUMN IF NOT EXISTS "point_of_sale_id" uuid NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_fiscal_dte_emissions_pos"
      ON "fiscal_dte_emissions" ("point_of_sale_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_fiscal_dte_emissions_pos";`);
    await queryRunner.query(`
      ALTER TABLE "fiscal_dte_emissions" DROP COLUMN IF EXISTS "point_of_sale_id";
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "point_of_sale_folio_allocations";`);
  }
}
