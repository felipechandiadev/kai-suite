import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReceptionVoid1757730000000 implements MigrationInterface {
  name = 'ReceptionVoid1757730000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "receptions"
        ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'ACTIVE',
        ADD COLUMN IF NOT EXISTS "voidedAt" timestamp NULL,
        ADD COLUMN IF NOT EXISTS "voidedBy" uuid NULL,
        ADD COLUMN IF NOT EXISTS "voidReason" text NULL,
        ADD COLUMN IF NOT EXISTS "voidTransactionId" uuid NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_receptions_company_status
        ON "receptions" ("company_id", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_receptions_company_status`);
    await queryRunner.query(`
      ALTER TABLE "receptions"
        DROP COLUMN IF EXISTS "voidTransactionId",
        DROP COLUMN IF EXISTS "voidReason",
        DROP COLUMN IF EXISTS "voidedBy",
        DROP COLUMN IF EXISTS "voidedAt",
        DROP COLUMN IF EXISTS "status"
    `);
  }
}
