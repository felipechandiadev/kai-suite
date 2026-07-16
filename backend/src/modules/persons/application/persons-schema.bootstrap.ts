import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Asegura columnas geo + ACTECO en `persons` (idempotente).
 */
@Injectable()
export class PersonsSchemaBootstrap implements OnModuleInit {
  private readonly logger = new Logger(PersonsSchemaBootstrap.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.dataSource.query(`
        ALTER TABLE "persons"
          ADD COLUMN IF NOT EXISTS "regionCode" varchar(8) NULL,
          ADD COLUMN IF NOT EXISTS "regionName" varchar(120) NULL,
          ADD COLUMN IF NOT EXISTS "communeCode" varchar(8) NULL,
          ADD COLUMN IF NOT EXISTS "communeName" varchar(120) NULL,
          ADD COLUMN IF NOT EXISTS "treasuryCode" varchar(8) NULL,
          ADD COLUMN IF NOT EXISTS "activityStarted" boolean NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS "economicActivities" json NULL
      `);
      // Migración legada RUN → RUT (idempotente; no elimina etiqueta de enum PG).
      await this.dataSource.query(`
        UPDATE persons
        SET "documentType" = 'RUT'
        WHERE "documentType"::text = 'RUN'
      `);
      await this.dataSource.query(`
        UPDATE persons
        SET "documentType" = 'OTHER'
        WHERE "documentType"::text = 'DNI'
      `);
    } catch (err) {
      this.logger.error(
        `No se pudo asegurar columnas geo/ACTECO en persons: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
