import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Asegura columnas de umbrales en `stock_levels` cuando la migración no está aplicada
 * (p. ej. entornos dev sin `migration:run`).
 */
@Injectable()
export class StockLevelThresholdSchemaBootstrap implements OnModuleInit {
  private readonly logger = new Logger(StockLevelThresholdSchemaBootstrap.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.dataSource.query(`
    ALTER TABLE "stock_levels"
    ADD COLUMN IF NOT EXISTS "minimum_stock" integer NULL
  `);
      await this.dataSource.query(`
    ALTER TABLE "stock_levels"
    ADD COLUMN IF NOT EXISTS "maximum_stock" integer NULL
  `);
      await this.dataSource.query(`
    ALTER TABLE "stock_levels"
    ADD COLUMN IF NOT EXISTS "reorder_point" integer NULL
  `);
      this.logger.log('stock_levels threshold columns OK');
    } catch (err) {
      this.logger.error(
        `Stock level threshold schema bootstrap failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }
}
