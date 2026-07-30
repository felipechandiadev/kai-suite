import { MigrationInterface, QueryRunner } from 'typeorm';

export class Dining1756940000000 implements MigrationInterface {
  name = 'Dining1756940000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE dining_order_kind_enum AS ENUM ('TABLE', 'COUNTER', 'TAKEAWAY');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE dining_order_status_enum AS ENUM (
          'FREE', 'OPEN', 'SENT', 'PARTIAL_READY', 'READY', 'BILLING', 'CLOSED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE kitchen_item_status_enum AS ENUM (
          'DRAFT', 'SENT', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE table_shape_enum AS ENUM ('RECT', 'CIRCLE');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE line_source_enum AS ENUM ('TABLE', 'COUNTER', 'DELIVERY', 'ESHOP');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dining_rooms (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL,
        branch_id uuid NOT NULL,
        name character varying(255) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        floor_plan jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dining_rooms" PRIMARY KEY (id)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_dining_rooms_company_id"
      ON dining_rooms (company_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_dining_rooms_branch_id"
      ON dining_rooms (branch_id);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dining_tables (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        dining_room_id uuid NOT NULL,
        code character varying(50) NOT NULL,
        label character varying(255) NOT NULL,
        capacity integer NOT NULL DEFAULT 2,
        shape table_shape_enum NOT NULL DEFAULT 'RECT',
        x numeric(10,2) NOT NULL DEFAULT 0,
        y numeric(10,2) NOT NULL DEFAULT 0,
        width numeric(10,2) NOT NULL DEFAULT 80,
        height numeric(10,2) NOT NULL DEFAULT 80,
        rotation numeric(8,2) NOT NULL DEFAULT 0,
        merge_group_id uuid,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dining_tables" PRIMARY KEY (id)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_dining_tables_room_id"
      ON dining_tables (dining_room_id);
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_dining_tables_room_code"
      ON dining_tables (dining_room_id, code);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dining_orders (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL,
        branch_id uuid NOT NULL,
        kind dining_order_kind_enum NOT NULL,
        dining_table_id uuid,
        display_label character varying(255) NOT NULL,
        dining_room_id uuid,
        opened_by_user_id uuid,
        status dining_order_status_enum NOT NULL DEFAULT 'OPEN',
        profile jsonb,
        opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        closed_at TIMESTAMPTZ,
        sale_draft_id uuid,
        linked_transaction_id uuid,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dining_orders" PRIMARY KEY (id)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_dining_orders_company_id"
      ON dining_orders (company_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_dining_orders_branch_status"
      ON dining_orders (branch_id, status);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_dining_orders_branch_kind"
      ON dining_orders (branch_id, kind);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_dining_orders_table_id"
      ON dining_orders (dining_table_id);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dining_order_lines (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        dining_order_id uuid NOT NULL,
        product_variant_id uuid NOT NULL,
        quantity numeric(12,3) NOT NULL DEFAULT 1,
        notes text,
        production_unit_id uuid,
        kitchen_status kitchen_item_status_enum NOT NULL DEFAULT 'DRAFT',
        line_source line_source_enum NOT NULL,
        sent_to_kitchen_at TIMESTAMPTZ,
        ready_at TIMESTAMPTZ,
        served_at TIMESTAMPTZ,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dining_order_lines" PRIMARY KEY (id)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_dining_order_lines_order_id"
      ON dining_order_lines (dining_order_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_dining_order_lines_kitchen_queue"
      ON dining_order_lines (production_unit_id, kitchen_status);
    `);

    await this.addFkIfMissing(
      queryRunner,
      'dining_rooms',
      'FK_dining_rooms_branch',
      `ALTER TABLE dining_rooms
       ADD CONSTRAINT "FK_dining_rooms_branch"
       FOREIGN KEY (branch_id) REFERENCES branches(id)
       ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await this.addFkIfMissing(
      queryRunner,
      'dining_tables',
      'FK_dining_tables_room',
      `ALTER TABLE dining_tables
       ADD CONSTRAINT "FK_dining_tables_room"
       FOREIGN KEY (dining_room_id) REFERENCES dining_rooms(id)
       ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await this.addFkIfMissing(
      queryRunner,
      'dining_orders',
      'FK_dining_orders_branch',
      `ALTER TABLE dining_orders
       ADD CONSTRAINT "FK_dining_orders_branch"
       FOREIGN KEY (branch_id) REFERENCES branches(id)
       ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await this.addFkIfMissing(
      queryRunner,
      'dining_orders',
      'FK_dining_orders_room',
      `ALTER TABLE dining_orders
       ADD CONSTRAINT "FK_dining_orders_room"
       FOREIGN KEY (dining_room_id) REFERENCES dining_rooms(id)
       ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await this.addFkIfMissing(
      queryRunner,
      'dining_orders',
      'FK_dining_orders_table',
      `ALTER TABLE dining_orders
       ADD CONSTRAINT "FK_dining_orders_table"
       FOREIGN KEY (dining_table_id) REFERENCES dining_tables(id)
       ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await this.addFkIfMissing(
      queryRunner,
      'dining_order_lines',
      'FK_dining_order_lines_order',
      `ALTER TABLE dining_order_lines
       ADD CONSTRAINT "FK_dining_order_lines_order"
       FOREIGN KEY (dining_order_id) REFERENCES dining_orders(id)
       ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await this.addFkIfMissing(
      queryRunner,
      'dining_order_lines',
      'FK_dining_order_lines_variant',
      `ALTER TABLE dining_order_lines
       ADD CONSTRAINT "FK_dining_order_lines_variant"
       FOREIGN KEY (product_variant_id) REFERENCES product_variants(id)
       ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await this.addFkIfMissing(
      queryRunner,
      'dining_order_lines',
      'FK_dining_order_lines_production_unit',
      `ALTER TABLE dining_order_lines
       ADD CONSTRAINT "FK_dining_order_lines_production_unit"
       FOREIGN KEY (production_unit_id) REFERENCES production_units(id)
       ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  private async addFkIfMissing(
    queryRunner: QueryRunner,
    tableName: string,
    constraintName: string,
    ddl: string,
  ): Promise<void> {
    const rows: Array<{ exists: boolean }> = await queryRunner.query(
      `SELECT EXISTS (
         SELECT 1
         FROM pg_constraint c
         JOIN pg_class t ON t.oid = c.conrelid
         JOIN pg_namespace n ON n.oid = t.relnamespace
         WHERE n.nspname = current_schema()
           AND t.relname = $1
           AND c.conname = $2
           AND c.contype = 'f'
       ) AS exists`,
      [tableName, constraintName],
    );
    if (!rows[0]?.exists) {
      await queryRunner.query(ddl);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE dining_order_lines DROP CONSTRAINT IF EXISTS "FK_dining_order_lines_production_unit";`,
    );
    await queryRunner.query(
      `ALTER TABLE dining_order_lines DROP CONSTRAINT IF EXISTS "FK_dining_order_lines_variant";`,
    );
    await queryRunner.query(
      `ALTER TABLE dining_order_lines DROP CONSTRAINT IF EXISTS "FK_dining_order_lines_order";`,
    );
    await queryRunner.query(
      `ALTER TABLE dining_orders DROP CONSTRAINT IF EXISTS "FK_dining_orders_table";`,
    );
    await queryRunner.query(
      `ALTER TABLE dining_orders DROP CONSTRAINT IF EXISTS "FK_dining_orders_room";`,
    );
    await queryRunner.query(
      `ALTER TABLE dining_orders DROP CONSTRAINT IF EXISTS "FK_dining_orders_branch";`,
    );
    await queryRunner.query(
      `ALTER TABLE dining_tables DROP CONSTRAINT IF EXISTS "FK_dining_tables_room";`,
    );
    await queryRunner.query(
      `ALTER TABLE dining_rooms DROP CONSTRAINT IF EXISTS "FK_dining_rooms_branch";`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_dining_order_lines_kitchen_queue";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_dining_order_lines_order_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS dining_order_lines;`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_dining_orders_table_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_dining_orders_branch_kind";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_dining_orders_branch_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_dining_orders_company_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS dining_orders;`);

    await queryRunner.query(`DROP INDEX IF EXISTS "uq_dining_tables_room_code";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_dining_tables_room_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS dining_tables;`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_dining_rooms_branch_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_dining_rooms_company_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS dining_rooms;`);

    await queryRunner.query(`DROP TYPE IF EXISTS line_source_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS table_shape_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS kitchen_item_status_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS dining_order_status_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS dining_order_kind_enum;`);
  }
}
