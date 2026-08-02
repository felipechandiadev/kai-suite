import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/** Asegura `unaccent` para búsqueda de catálogo (ILIKE + sin tildes). */
@Injectable()
export class ProductCatalogSearchBootstrap implements OnModuleInit {
  private readonly logger = new Logger(ProductCatalogSearchBootstrap.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureExtension('unaccent');
    await this.ensureProductVisibleInEShopColumn();
    await this.ensureProductOnMenuColumn();
  }

  /** Columna de migración 1756430000000; evita 500 si `migration:run` no llegó a aplicarla. */
  private async ensureProductVisibleInEShopColumn(): Promise<void> {
    try {
      await this.dataSource.query(`
        ALTER TABLE "products"
        ADD COLUMN IF NOT EXISTS "visible_in_e_shop" boolean NOT NULL DEFAULT false;
      `);
    } catch (err) {
      this.logger.error(
        `No se pudo asegurar products.visible_in_e_shop: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async ensureProductOnMenuColumn(): Promise<void> {
    try {
      await this.dataSource.query(`
        ALTER TABLE "products"
        ADD COLUMN IF NOT EXISTS "on_menu" boolean NOT NULL DEFAULT false;
      `);
    } catch (err) {
      this.logger.error(
        `No se pudo asegurar products.on_menu: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async ensureExtension(name: string): Promise<void> {
    try {
      const rows = await this.dataSource.query<{ exists: boolean }[]>(
        `SELECT EXISTS (
           SELECT 1 FROM pg_extension WHERE extname = $1
         ) AS exists`,
        [name],
      );
      if (rows?.[0]?.exists) return;

      this.logger.warn(
        `Extensión ${name} no presente; creándola con CREATE EXTENSION IF NOT EXISTS.`,
      );
      await this.dataSource.query(
        `CREATE EXTENSION IF NOT EXISTS "${name}"`,
      );
      this.logger.log(`Extensión ${name} asegurada en la BD.`);
    } catch (err) {
      this.logger.error(
        `No se pudo asegurar la extensión ${name}: ${
          err instanceof Error ? err.message : String(err)
        }. Ejecuta manualmente CREATE EXTENSION IF NOT EXISTS ${name};`,
      );
    }
  }
}
