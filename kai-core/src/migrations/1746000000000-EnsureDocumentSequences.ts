import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea la tabla `document_sequences` si aún no existe.
 *
 * Contexto del bug:
 *   La entidad `DocumentSequence` siempre estuvo registrada en
 *   `typeorm.config.ts`, pero la tabla se creaba implícitamente mediante
 *   `synchronize: true` en entornos de desarrollo. En despliegues con
 *   `synchronize: false` (o en bases de datos resincronizadas) la tabla
 *   nunca llegó a materializarse, lo que provoca:
 *
 *     QueryFailedError: relation "document_sequences" does not exist
 *
 *   tanto al abrir una sesión de caja (`CASH_SESSION_OPENING`) como al
 *   emitir cualquier transacción nueva (incluidas cotizaciones).
 *
 * Diseño:
 *   - `company_id` `NOT NULL` con FK a `companies(id)` para alinearse con
 *     la convención multi-tenant.
 *   - Constraint única `(branchId, transactionType, year)` para evitar
 *     races en el folio correlativo (`DocumentNumberService.bumpSequence`
 *     usa `SELECT ... FOR UPDATE`).
 *   - Índice por `company_id` (mismo patrón que el resto del esquema).
 *
 *   La migración es idempotente: si la tabla ya existe (DB creada con
 *   `synchronize`) no hace nada.
 */
export class EnsureDocumentSequences1746000000000
  implements MigrationInterface
{
  name = 'EnsureDocumentSequences1746000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists: Array<{ exists: boolean }> = await queryRunner.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables
         WHERE table_schema = current_schema()
           AND table_name = 'document_sequences'
       ) AS exists`,
    );
    if (exists[0]?.exists) {
      return;
    }

    await queryRunner.query(`
      CREATE TABLE "document_sequences" (
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

    await queryRunner.query(`
      CREATE INDEX "idx_document_sequences_company_id"
        ON "document_sequences" ("company_id");
    `);

    // FK a companies (consistente con resto del esquema multi-tenant).
    await queryRunner.query(`
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "document_sequences";`);
  }
}
