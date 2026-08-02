#!/usr/bin/env ts-node
/**
 * Marca migraciones como ejecutadas sin correr SQL (dev: BD creada con DB_SYNCHRONIZE).
 * Uso: npm run migration:baseline
 */
import { AppDataSource } from '../src/config/data-source';

async function main(): Promise<void> {
  await AppDataSource.initialize();
  const runner = AppDataSource.createQueryRunner();

  const allNames = AppDataSource.migrations
    .map((m) => m.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0);
  const rows: Array<{ name: string }> = await runner.query(
    `SELECT name FROM typeorm_migrations`,
  );
  const existing = new Set(rows.map((r) => r.name));
  const pending = allNames.filter((name) => !existing.has(name));

  if (pending.length === 0) {
    console.log(`✅ Baseline OK: ${allNames.length} migración(es) ya registradas.`);
    await AppDataSource.destroy();
    return;
  }

  for (const name of pending) {
    const match = name.match(/(\d{13,})/);
    const timestamp = match ? Number(match[1]) : Date.now();
    await runner.query(
      `INSERT INTO typeorm_migrations (timestamp, name) VALUES ($1, $2)`,
      [timestamp, name],
    );
    console.log(`  → stamped ${name}`);
  }

  console.log(
    `✅ Baseline OK: ${pending.length} migración(es) registradas (${allNames.length} total).`,
  );
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
