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
      this.logger.log('dining_order_lines CTP reservation columns OK');
    } catch (err) {
      this.logger.error(
        `Dining schema bootstrap failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }
}
