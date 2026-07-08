import { MigrationInterface, QueryRunner } from 'typeorm';

export class PosSyncCashSessionId1756720000000 implements MigrationInterface {
  name = 'PosSyncCashSessionId1756720000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pos_sync_commands"
      ADD COLUMN IF NOT EXISTS "cash_session_id" uuid;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_pos_sync_cash_session"
      ON "pos_sync_commands" ("cash_session_id", "status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_pos_sync_cash_session";`);
    await queryRunner.query(`
      ALTER TABLE "pos_sync_commands"
      DROP COLUMN IF EXISTS "cash_session_id";
    `);
  }
}
