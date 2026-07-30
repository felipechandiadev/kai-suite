import { MigrationInterface, QueryRunner } from 'typeorm';

export class PosSyncCommands1756710000000 implements MigrationInterface {
  name = 'PosSyncCommands1756710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pos_sync_commands" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "client_operation_id" character varying(128) NOT NULL,
        "device_id" character varying(64) NOT NULL,
        "command_type" character varying(32) NOT NULL,
        "transaction_id" uuid,
        "status" character varying(32) NOT NULL DEFAULT 'PENDING',
        "response_json" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pos_sync_commands" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_pos_sync_client_operation"
      ON "pos_sync_commands" ("company_id", "client_operation_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_pos_sync_device"
      ON "pos_sync_commands" ("device_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "pos_sync_commands";`);
  }
}
