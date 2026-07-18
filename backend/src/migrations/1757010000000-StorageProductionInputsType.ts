import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega StorageType.PRODUCTION_INPUTS al enum PG de storages.type (si aplica).
 * El backfill de filas va en la migración siguiente (PG no permite usar el valor
 * nuevo en la misma transacción/sesión que ADD VALUE).
 */
export class StorageProductionInputsType1757010000000
  implements MigrationInterface
{
  name = 'StorageProductionInputsType1757010000000';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    const meta: Array<{
      udt_name: string;
      column_name: string;
      is_enum: boolean;
    }> = await queryRunner.query(`
      SELECT c.udt_name, c.column_name,
        EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = c.udt_name
            AND n.nspname = 'public'
            AND t.typtype = 'e'
        ) AS is_enum
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = 'storages'
        AND lower(c.column_name) = 'type'
      LIMIT 1
    `);

    const m = meta[0];
    if (m?.is_enum && m.udt_name) {
      const udtQ = `"${m.udt_name.replace(/"/g, '')}"`;
      await queryRunner.query(
        `ALTER TYPE public.${udtQ} ADD VALUE IF NOT EXISTS 'PRODUCTION_INPUTS'`,
      );
    }
  }

  public async down(): Promise<void> {
    /* No se revierte el valor de enum PG. */
  }
}
