import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Asegura columnas CTP en `dining_order_lines` cuando la migración no está aplicada
 * (p. ej. entornos dev sin `migration:run` tras seed).
 */
@Injectable()
export class DiningSchemaBootstrap implements OnModuleInit {
  private readonly logger = new Logger(DiningSchemaBootstrap.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.dataSource.query(`
        ALTER TABLE dining_order_lines
        ADD COLUMN IF NOT EXISTS material_reservation_transaction_id uuid NULL
      `);
      await this.dataSource.query(`
        ALTER TABLE dining_order_lines
        ADD COLUMN IF NOT EXISTS materials_reserved_at timestamptz NULL
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_dining_order_lines_material_reservation_tx
        ON dining_order_lines (material_reservation_transaction_id)
        WHERE material_reservation_transaction_id IS NOT NULL
      `);
      await this.dataSource.query(`
        ALTER TABLE dining_order_lines
        ADD COLUMN IF NOT EXISTS kitchen_fire_id uuid NULL
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_dining_order_lines_kitchen_fire
        ON dining_order_lines (production_unit_id, kitchen_fire_id, kitchen_status)
      `);
      await this.dataSource.query(`
        ALTER TABLE dining_order_lines
        ADD COLUMN IF NOT EXISTS kitchen_fire_number int NULL
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS dining_kitchen_fire_sequences (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id uuid NOT NULL,
          branch_id uuid NOT NULL,
          period_key varchar(10) NOT NULL,
          last_number int NOT NULL DEFAULT 0
        )
      `);
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_dining_kitchen_fire_sequences_scope
        ON dining_kitchen_fire_sequences (branch_id, period_key)
      `);
      await this.dataSource.query(`
        ALTER TABLE dining_branch_settings
        ADD COLUMN IF NOT EXISTS pos_accounts_menu_category_ids jsonb NOT NULL DEFAULT '[]'::jsonb
      `);
      await this.dataSource.query(`
        DO $$ BEGIN
          ALTER TYPE "dining_order_status_enum" ADD VALUE IF NOT EXISTS 'VOID';
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS dining_order_line_addons (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          dining_order_line_id uuid NOT NULL REFERENCES dining_order_lines(id) ON DELETE CASCADE,
          addon_variant_id uuid NOT NULL,
          quantity numeric(12,3) NOT NULL DEFAULT 1,
          display_name varchar(255) NOT NULL,
          unit_price_snapshot numeric(15,2) NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_dining_order_line_addons_line_id
        ON dining_order_line_addons (dining_order_line_id)
      `);
      this.logger.log('dining_order_lines CTP + kitchen_fire columns OK');
    } catch (err) {
      this.logger.error(
        `Dining schema bootstrap failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }
}
