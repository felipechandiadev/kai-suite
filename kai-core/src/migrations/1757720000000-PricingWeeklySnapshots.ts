import { MigrationInterface, QueryRunner } from 'typeorm';

export class PricingWeeklySnapshots1757720000000 implements MigrationInterface {
  name = 'PricingWeeklySnapshots1757720000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pricing_weekly_snapshots" (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "weekIso" varchar(10) NOT NULL,
        "branchId" uuid NULL,
        "categoryId" uuid NULL,
        "priceListId" uuid NULL,
        "targetMarginPercent" numeric(5,2) NOT NULL DEFAULT 35,
        "gfPoolNet" numeric(15,2) NOT NULL DEFAULT 0,
        "companyNetSales" numeric(15,2) NOT NULL DEFAULT 0,
        "entityNetSales" numeric(15,2) NOT NULL DEFAULT 0,
        "gfQuota" numeric(15,2) NOT NULL DEFAULT 0,
        "unitQuota" numeric(15,2) NOT NULL DEFAULT 0,
        "salesWindowFrom" date NOT NULL,
        "salesWindowTo" date NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'DRAFT',
        "appliedAt" timestamp NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pricing_snapshots_company_week
        ON "pricing_weekly_snapshots" ("companyId", "weekIso")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pricing_weekly_snapshot_lines" (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "snapshotId" uuid NOT NULL REFERENCES "pricing_weekly_snapshots"(id) ON DELETE CASCADE,
        "variantId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        sku varchar(255) NULL,
        "productName" varchar(255) NOT NULL,
        "categoryId" uuid NULL,
        "floorNet" numeric(15,2) NOT NULL DEFAULT 0,
        "listNet" numeric(15,2) NOT NULL DEFAULT 0,
        "listGross" numeric(15,2) NOT NULL DEFAULT 0,
        "unitQuota" numeric(15,2) NOT NULL DEFAULT 0,
        "peNet" numeric(15,2) NOT NULL DEFAULT 0,
        "targetNet" numeric(15,2) NOT NULL DEFAULT 0,
        "suggestedNet" numeric(15,2) NOT NULL DEFAULT 0,
        "suggestedGross" numeric(15,2) NOT NULL DEFAULT 0,
        alert varchar(30) NOT NULL DEFAULT 'INSUFFICIENT_DATA',
        "unitsInWindow" numeric(15,4) NOT NULL DEFAULT 0
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pricing_snapshot_lines_snapshot
        ON "pricing_weekly_snapshot_lines" ("snapshotId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "pricing_weekly_snapshot_lines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pricing_weekly_snapshots"`);
  }
}
