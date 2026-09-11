import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ProductsSchemaBootstrap implements OnModuleInit {
  private readonly logger = new Logger(ProductsSchemaBootstrap.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS product_addons (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id uuid NOT NULL,
          host_product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          addon_product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
          sort_order int NOT NULL DEFAULT 1,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT uq_product_addons_host_addon UNIQUE (host_product_id, addon_product_id)
        )
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_product_addons_company_id
        ON product_addons (company_id)
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_product_addons_host_product_id
        ON product_addons (host_product_id)
      `);
      this.logger.log('product_addons schema OK');
    } catch (err) {
      this.logger.error(
        `Products schema bootstrap failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }
}
