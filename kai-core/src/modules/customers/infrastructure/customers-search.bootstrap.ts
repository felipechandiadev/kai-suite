import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Asegura, de forma idempotente, que las funcionalidades de PostgreSQL
 * necesarias para la búsqueda de clientes estén disponibles:
 *
 *  - Extensión `unaccent`: permite hacer búsquedas insensibles a tildes
 *    (`unaccent('Pérez') = 'Perez'`). Se combina con `ILIKE` para que
 *    la búsqueda también sea insensible a mayúsculas/minúsculas.
 *
 * Se ejecuta en `OnModuleInit` (no como migración) porque en entornos
 * de desarrollo no siempre se corre `typeorm migration:run`, y queremos
 * que el feature funcione "out of the box". Si el rol de DB no tiene
 * permisos para `CREATE EXTENSION` simplemente se loguea un warning y
 * la búsqueda seguirá funcionando como antes (en ese caso, la consulta
 * con `unaccent()` fallará en tiempo de query y se recomienda crear la
 * extensión manualmente con un usuario superuser).
 */
@Injectable()
export class CustomersSearchBootstrap implements OnModuleInit {
  private readonly logger = new Logger(CustomersSearchBootstrap.name);

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
           SELECT 1
           FROM pg_extension
           WHERE extname = $1
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
        }. ` +
          `Ejecuta manualmente \`CREATE EXTENSION IF NOT EXISTS ${name};\` ` +
          `con un usuario con privilegios suficientes.`,
      );
    }
  }
}
