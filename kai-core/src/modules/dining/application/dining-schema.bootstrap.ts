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
      this.logger.log('dining_order_lines CTP + kitchen_fire columns OK');
    } catch (err) {
      this.logger.error(
        `Dining schema bootstrap failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }
}
