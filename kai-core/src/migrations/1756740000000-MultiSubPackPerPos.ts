import { MigrationInterface, QueryRunner } from 'typeorm';

export class MultiSubPackPerPos1756740000000 implements MigrationInterface {
  name = 'MultiSubPackPerPos1756740000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "uq_pos_folio_alloc_pos_dte_env";
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_pos_folio_alloc_pos_dte_env_range"
      ON "point_of_sale_folio_allocations" ("point_of_sale_id", "dte_type", "environment", "range_from");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_pos_folio_alloc_pos_dte_env_range";
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_pos_folio_alloc_pos_dte_env"
      ON "point_of_sale_folio_allocations" ("point_of_sale_id", "dte_type", "environment");
    `);
  }
}
