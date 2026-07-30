import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Asegura columnas de logística en `product_variants` cuando la migración no está aplicada
 * (p. ej. entornos dev sin `migration:run`).
 */
@Injectable()
export class ProductVariantShippingSchemaBootstrap implements OnModuleInit {
  private readonly logger = new Logger(
    ProductVariantShippingSchemaBootstrap.name,
  );

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.dataSource.query(`
    ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS net_weight_kg numeric(14,6) NULL
  `);
      await this.dataSource.query(`
    ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS gross_weight_kg numeric(14,6) NULL
  `);
      await this.dataSource.query(`
    ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS package_length_cm numeric(12,3) NULL
  `);
      await this.dataSource.query(`
    ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS package_width_cm numeric(12,3) NULL
  `);
      await this.dataSource.query(`
    ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS package_height_cm numeric(12,3) NULL
  `);
      await this.dataSource.query(`
    ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS volumetric_divisor_k integer NULL
  `);
      this.logger.log('product_variants shipping / logistics columns OK');
    } catch (err) {
      this.logger.error(
        `Product variant shipping schema bootstrap failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }
}
