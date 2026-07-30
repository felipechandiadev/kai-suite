import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Pedidos de estación (fires) como entidad + FK desde dining_order_lines.
 * Backfill desde kitchen_fire_id existente.
 */
export class DiningStationOrders1757310000000 implements MigrationInterface {
  name = 'DiningStationOrders1757310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE dining_station_order_status_enum AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dining_station_orders (
        id uuid PRIMARY KEY,
        company_id uuid NOT NULL,
        branch_id uuid NOT NULL,
        dining_order_id uuid NOT NULL
          REFERENCES dining_orders(id) ON DELETE CASCADE,
        period_key varchar(10) NOT NULL,
        sequence_number int NOT NULL,
        status dining_station_order_status_enum NOT NULL DEFAULT 'OPEN',
        sent_at timestamptz NOT NULL,
        completed_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dining_station_orders_branch_period
      ON dining_station_orders (branch_id, period_key)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dining_station_orders_dining_order
      ON dining_station_orders (dining_order_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dining_station_orders_company_id
      ON dining_station_orders (company_id)
    `);

    await queryRunner.query(`
      ALTER TABLE dining_order_lines
      ADD COLUMN IF NOT EXISTS station_order_id uuid NULL
    `);

    await queryRunner.query(`
      INSERT INTO dining_station_orders (
        id, company_id, branch_id, dining_order_id, period_key, sequence_number,
        status, sent_at, completed_at, created_at, updated_at
      )
      SELECT
        fire_id,
        company_id,
        branch_id,
        dining_order_id,
        to_char(sent_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD'),
        sequence_number,
        CASE
          WHEN cancelled_count = line_count THEN 'CANCELLED'::dining_station_order_status_enum
          WHEN terminal_count = line_count THEN 'COMPLETED'::dining_station_order_status_enum
          ELSE 'OPEN'::dining_station_order_status_enum
        END,
        sent_at,
        CASE
          WHEN terminal_count = line_count THEN completed_candidate
          ELSE NULL
        END,
        sent_at,
        now()
      FROM (
        SELECT
          l.kitchen_fire_id AS fire_id,
          o.company_id,
          o.branch_id,
          l.dining_order_id,
          COALESCE(MAX(l.kitchen_fire_number), 0) AS sequence_number,
          MIN(COALESCE(l.sent_to_kitchen_at, l.created_at)) AS sent_at,
          MAX(COALESCE(l.ready_at, l.served_at, l.updated_at)) AS completed_candidate,
          COUNT(*)::int AS line_count,
          COUNT(*) FILTER (
            WHERE l.kitchen_status::text IN ('READY', 'SERVED', 'CANCELLED')
          )::int AS terminal_count,
          COUNT(*) FILTER (
            WHERE l.kitchen_status::text = 'CANCELLED'
          )::int AS cancelled_count
        FROM dining_order_lines l
        INNER JOIN dining_orders o ON o.id = l.dining_order_id
        WHERE l.kitchen_fire_id IS NOT NULL
        GROUP BY
          l.kitchen_fire_id,
          o.company_id,
          o.branch_id,
          l.dining_order_id
      ) agg
      ON CONFLICT (id) DO NOTHING
    `);

    await queryRunner.query(`
      UPDATE dining_order_lines
      SET station_order_id = kitchen_fire_id
      WHERE kitchen_fire_id IS NOT NULL
        AND station_order_id IS NULL
        AND EXISTS (
          SELECT 1 FROM dining_station_orders so WHERE so.id = kitchen_fire_id
        )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE dining_order_lines
          ADD CONSTRAINT fk_dining_order_lines_station_order
          FOREIGN KEY (station_order_id)
          REFERENCES dining_station_orders(id)
          ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dining_order_lines_station_order
      ON dining_order_lines (station_order_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE dining_order_lines
      DROP CONSTRAINT IF EXISTS fk_dining_order_lines_station_order
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_dining_order_lines_station_order
    `);
    await queryRunner.query(`
      ALTER TABLE dining_order_lines
      DROP COLUMN IF EXISTS station_order_id
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_dining_station_orders_company_id
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_dining_station_orders_dining_order
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_dining_station_orders_branch_period
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS dining_station_orders`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS dining_station_order_status_enum`,
    );
  }
}
