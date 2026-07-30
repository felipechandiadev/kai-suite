import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/** Asegura `unaccent` para búsqueda de stock (ILIKE + sin tildes). */
@Injectable()
export class InventorySearchBootstrap implements OnModuleInit {
  private readonly logger = new Logger(InventorySearchBootstrap.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureExtension('unaccent');
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
