import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Una unidad predeterminada por empresa (is_default).
 */
export class UnitIsDefault1756080000000 implements MigrationInterface {
  name = 'UnitIsDefault1756080000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "units"
      ADD COLUMN IF NOT EXISTS "is_default" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          u.id,
          ROW_NUMBER() OVER (
            PARTITION BY u.company_id
            ORDER BY
              CASE WHEN lower(u.symbol) = 'un' THEN 0 ELSE 1 END,
              CASE WHEN u."isBase" = true AND u.dimension::text = 'count' THEN 0 ELSE 1 END,
              u.symbol ASC
          ) AS rn
        FROM "units" u
        WHERE u."deletedAt" IS NULL AND u.active = true
      )
      UPDATE "units" u
      SET "is_default" = true
      FROM ranked r
      WHERE u.id = r.id AND r.rn = 1
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_units_default_company"
      ON "units" ("company_id")
      WHERE "is_default" = true AND "deletedAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_units_default_company"`);
    await queryRunner.query(`ALTER TABLE "units" DROP COLUMN IF EXISTS "is_default"`);
  }
}
