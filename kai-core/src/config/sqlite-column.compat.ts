import { getMetadataArgsStorage } from 'typeorm';

const SQLITE_COLUMN_TYPE_MAP: Record<string, string> = {
  jsonb: 'json',
  enum: 'varchar',
  timestamp: 'datetime',
  timestamptz: 'datetime',
  'timestamp with time zone': 'datetime',
  'timestamp without time zone': 'datetime',
  time: 'text',
  interval: 'text',
  bytea: 'blob',
};

/**
 * Maps Postgres-only column types to SQLite-friendly equivalents before DataSource init.
 * Invoked when KAI_EDITION=lite (see typeorm.config.ts).
 */
export function patchEntityColumnsForSqlite(): void {
  const storage = getMetadataArgsStorage();

  for (const column of storage.columns) {
    const t = column.options.type;
    if (typeof t === 'string' && SQLITE_COLUMN_TYPE_MAP[t]) {
      (column.options as { type?: unknown }).type = SQLITE_COLUMN_TYPE_MAP[t];
    }
  }
}
