import { MigrationInterface, QueryRunner } from 'typeorm';

export class PrintAgentsCatalog1757470000000 implements MigrationInterface {
  name = 'PrintAgentsCatalog1757470000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "print_agents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "branch_id" uuid,
        "display_name" character varying(120) NOT NULL,
        "token_hash" character varying(64) NOT NULL,
        "lan_host" character varying(255),
        "ws_port" integer,
        "wss_port" integer,
        "use_tls" boolean NOT NULL DEFAULT false,
        "platform" character varying(20) NOT NULL DEFAULT 'unknown',
        "is_active" boolean NOT NULL DEFAULT true,
        "revoked_at" TIMESTAMPTZ,
        "last_seen_at" TIMESTAMPTZ,
        "paired_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_print_agents" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_print_agents_token_hash" UNIQUE ("token_hash")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_print_agents_company_id"
        ON "print_agents" ("company_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_print_agents_branch_id"
        ON "print_agents" ("branch_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_print_agents_branch_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_print_agents_company_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "print_agents"`);
  }
}
