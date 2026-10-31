import type { DataSource } from 'typeorm';

/**
 * Ejecuta `fn` reteniendo locks de PostgreSQL (`pg_advisory_xact_lock`) por clave en una
 * conexión aparte, para serializar operaciones concurrentes sobre el mismo documento
 * (p. ej. dos anulaciones del mismo encargo). Las claves se ordenan para evitar interbloqueos.
 */
export async function withAdvisoryLocks<T>(
  dataSource: DataSource,
  keys: string[],
  fn: () => Promise<T>,
): Promise<T> {
  const sorted = [...new Set(keys.map((k) => k.trim()).filter(Boolean))].sort();
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    for (const key of sorted) {
      await runner.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);
    }
    return await fn();
  } finally {
    await runner.rollbackTransaction().catch(() => undefined);
    await runner.release();
  }
}
