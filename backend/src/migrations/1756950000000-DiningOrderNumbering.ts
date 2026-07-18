import { MigrationInterface, QueryRunner } from 'typeorm';

export class DiningOrderNumbering1756950000000 implements MigrationInterface {
  name = 'DiningOrderNumbering1756950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dining_branch_settings (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL,
        branch_id uuid NOT NULL,
        timezone character varying(64) NOT NULL DEFAULT 'America/Santiago',
        reset_time_local character varying(8) NOT NULL DEFAULT '00:00:01',
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dining_branch_settings" PRIMARY KEY (id)
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_dining_branch_settings_branch"
      ON dining_branch_settings (branch_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_dining_branch_settings_company_id"
      ON dining_branch_settings (company_id);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dining_order_sequences (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL,
        branch_id uuid NOT NULL,
        kind dining_order_kind_enum NOT NULL,
        period_key character varying(10) NOT NULL,
        last_number integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_dining_order_sequences" PRIMARY KEY (id)
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_dining_order_sequences_scope"
      ON dining_order_sequences (branch_id, kind, period_key);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_dining_order_sequences_company_id"
      ON dining_order_sequences (company_id);
    `);

    await queryRunner.query(`
      ALTER TABLE dining_orders
      ADD COLUMN IF NOT EXISTS sequence_number integer;
    `);
    await queryRunner.query(`
      ALTER TABLE dining_orders
      ADD COLUMN IF NOT EXISTS sequence_period_key character varying(10);
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_dining_orders_sequence_scope"
      ON dining_orders (branch_id, kind, sequence_period_key, sequence_number)
      WHERE sequence_number IS NOT NULL AND sequence_period_key IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "uq_dining_orders_sequence_scope";
    `);
    await queryRunner.query(`
      ALTER TABLE dining_orders DROP COLUMN IF EXISTS sequence_period_key;
    `);
    await queryRunner.query(`
      ALTER TABLE dining_orders DROP COLUMN IF EXISTS sequence_number;
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS dining_order_sequences;`);
    await queryRunner.query(`DROP TABLE IF EXISTS dining_branch_settings;`);
  }
}
