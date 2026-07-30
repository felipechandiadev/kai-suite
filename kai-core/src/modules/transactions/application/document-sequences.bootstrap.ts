import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Bootstrap idempotente que garantiza la existencia de la tabla
 * `document_sequences` al arrancar la app.
 *
 * Contexto del bug:
 *   La entidad `DocumentSequence` se registró siempre en `typeorm.config.ts`
 *   asumiendo que la tabla la materializaría `synchronize: true` en
 *   desarrollo. En ambientes con `synchronize: false`, o en bases que se
 *   regeneraron sin pasar por todas las sincronizaciones previas, la tabla
 *   no existe y cualquier operación que asigne folio falla con:
 *
 *     QueryFailedError: relation "document_sequences" does not exist
 *
 *   afectando creación de transacciones (incluidas cotizaciones) y la
 *   apertura de sesiones de caja.
 *
 *   Este bootstrap aplica la corrección sin requerir un `migration:run`,
 *   alineado con el patrón ya usado por `SupplierInvoiceEnumBootstrap`.
 *
 *   También existe la migración `EnsureDocumentSequences1746000000000`
 *   para entornos que sí gestionan schema via migrations CLI; ambas
 *   convergen al mismo resultado.
 */
@Injectable()
export class DocumentSequencesBootstrap implements OnModuleInit {
  private readonly logger = new Logger(DocumentSequencesBootstrap.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      const exists = await this.dataSource.query<{ exists: boolean }[]>(
        `SELECT EXISTS (
           SELECT FROM information_schema.tables
           WHERE table_schema = current_schema()
             AND table_name = 'document_sequences'
         ) AS exists`,
      );
      if (exists?.[0]?.exists) {
        return;
      }

      this.logger.warn(
        'Tabla document_sequences no existe; creándola con DDL idempotente.',
      );

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "document_sequences" (
          "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          "company_id" uuid NOT NULL,
          "branchId" uuid NOT NULL,
          "transactionType" varchar(64) NOT NULL,
          "year" int NOT NULL,
          "lastNumber" int NOT NULL DEFAULT 0,
          CONSTRAINT "UQ_document_sequences_scope"
            UNIQUE ("branchId", "transactionType", "year")
        );
      `);

      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS "idx_document_sequences_company_id"
          ON "document_sequences" ("company_id");
      `);

      await this.dataSource.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints
            WHERE table_schema = current_schema()
              AND table_name = 'document_sequences'
              AND constraint_name = 'FK_document_sequences_company'
          ) THEN
            ALTER TABLE "document_sequences"
              ADD CONSTRAINT "FK_document_sequences_company"
              FOREIGN KEY ("company_id") REFERENCES "companies"("id")
              ON DELETE RESTRICT ON UPDATE CASCADE;
          END IF;
        END $$;
      `);

      this.logger.log('Tabla document_sequences asegurada correctamente.');
    } catch (err) {
      // Non-fatal: si el ambiente no soporta este DDL (DB readonly, etc.)
      // dejamos que cualquier operación posterior falle con el error
      // original; no queremos enmascarar problemas mayores.
      this.logger.error(
        `No se pudo asegurar document_sequences: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
