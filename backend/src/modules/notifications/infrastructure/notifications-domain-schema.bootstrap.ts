import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Garantiza el valor CATALOG en el enum PG de notifications.domain
 * (entornos dev sin migration:run).
 */
@Injectable()
export class NotificationsDomainSchemaBootstrap implements OnModuleInit {
  private readonly logger = new Logger(NotificationsDomainSchemaBootstrap.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.dataSource.query(`
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
            RETURN;
          END IF;

          EXECUTE format(
            'ALTER TYPE public.%I ADD VALUE IF NOT EXISTS %L',
            udt,
            'CATALOG'
          );
        END $$;
      `);
      this.logger.log('notifications.domain CATALOG enum value OK');
    } catch (err) {
      this.logger.error(
        `Notifications domain schema bootstrap failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
