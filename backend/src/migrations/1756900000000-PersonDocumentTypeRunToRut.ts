import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `Person.documentType`: migra valor legado `RUN` → `RUT`.
 * En Chile el identificador es el mismo; se deja de usar el literal RUN.
 *
 * No se elimina la etiqueta `RUN` del enum nativo de Postgres (no es portable).
 * El código TypeScript deja de emitir/aceptar RUN.
 */
export class PersonDocumentTypeRunToRut1756900000000
  implements MigrationInterface
{
  name = 'PersonDocumentTypeRunToRut1756900000000';
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
        AND c.table_name = 'persons'
        AND lower(c.column_name) IN ('documenttype', 'document_type')
      LIMIT 1
    `);

    const m = meta[0];
    if (!m?.column_name) {
      return;
    }

    const safeIdent = (name: string): string => {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
        throw new Error(`Refusing unsafe PG identifier: ${name}`);
      }
      return `"${name}"`;
    };

    const colQ = safeIdent(m.column_name);
    const udtQ = safeIdent(m.udt_name);

    if (m.is_enum) {
      await queryRunner.query(
        `UPDATE persons SET ${colQ} = 'RUT'::public.${udtQ} WHERE ${colQ}::text = 'RUN'`,
      );
    } else {
      await queryRunner.query(
        `UPDATE persons SET ${colQ} = 'RUT' WHERE ${colQ} = 'RUN'`,
      );
    }
  }

  public async down(): Promise<void> {
    /* No se revierte: RUN deja de ser un valor de dominio válido. */
  }
}
