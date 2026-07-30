import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Añade NotificationDomain.CATALOG al enum PG de notifications.domain.
 */
export class NotificationDomainCatalog1757130000000
  implements MigrationInterface
{
  name = 'NotificationDomainCatalog1757130000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        udt text;
        is_enum boolean;
      BEGIN
        SELECT c.udt_name INTO udt
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'notifications'
          AND c.column_name = 'domain'
        LIMIT 1;

        IF udt IS NULL THEN
          RAISE NOTICE 'notifications.domain no existe; se omite ALTER TYPE';
          RETURN;
        END IF;

        SELECT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = udt
            AND n.nspname = 'public'
            AND t.typtype = 'e'
        ) INTO is_enum;

        IF NOT is_enum THEN
          RAISE NOTICE 'notifications.domain no es enum PG; se omite ALTER TYPE';
          RETURN;
        END IF;

        EXECUTE format(
          'ALTER TYPE public.%I ADD VALUE IF NOT EXISTS %L',
          udt,
          'CATALOG'
        );
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PG no permite quitar valores de enum de forma segura; no-op.
    void queryRunner;
  }
}
