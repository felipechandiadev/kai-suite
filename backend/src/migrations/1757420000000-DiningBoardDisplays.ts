import { MigrationInterface, QueryRunner } from 'typeorm';

export class DiningBoardDisplays1757420000000 implements MigrationInterface {
  name = 'DiningBoardDisplays1757420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dining_board_displays" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "token_hash" character varying(64) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "revoked_at" TIMESTAMPTZ,
        "last_seen_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dining_board_displays" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_dining_board_displays_token_hash" UNIQUE ("token_hash")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_dining_board_displays_company_id"
        ON "dining_board_displays" ("company_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_dining_board_displays_branch_id"
        ON "dining_board_displays" ("branch_id")
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "dining_board_displays"
          ADD CONSTRAINT "FK_dining_board_displays_branch"
          FOREIGN KEY ("branch_id") REFERENCES "branches"("id")
          ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dining_board_displays" DROP CONSTRAINT IF EXISTS "FK_dining_board_displays_branch"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_dining_board_displays_branch_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_dining_board_displays_company_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "dining_board_displays"`);
  }
}
