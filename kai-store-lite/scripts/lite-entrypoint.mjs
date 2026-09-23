#!/usr/bin/env node
/**
 * Boots kai-core in Lite edition (SQLite sidecar).
 *
 * Path: kai-store-lite/scripts/lite-entrypoint.mjs
 * Invoked from Tauri sidecar (`sidecar/spawn.rs`) or manually during dev.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');
const kaiCoreDir = resolve(repoRoot, 'kai-core');
const liteDataDir = resolve(__dirname, '../.data');

const port = String(process.env.KAI_CORE_PORT ?? process.env.PORT ?? '4100');
const sqlitePath =
  process.env.DB_DATABASE ??
  process.env.LITE_SQLITE_PATH ??
  resolve(liteDataDir, 'kai-store-lite.sqlite');

mkdirSync(dirname(sqlitePath), { recursive: true });
mkdirSync(liteDataDir, { recursive: true });

const env = {
  ...process.env,
  KAI_EDITION: 'lite',
  KAI_PRODUCT: process.env.KAI_PRODUCT ?? 'kaistore',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: port,
  API_PREFIX: process.env.API_PREFIX ?? 'api',
  DB_TYPE: 'better-sqlite3',
  DB_DATABASE: sqlitePath,
  DB_USERNAME: process.env.DB_USERNAME ?? 'lite',
  DB_PASSWORD: process.env.DB_PASSWORD ?? 'lite',
  DB_SYNCHRONIZE: process.env.DB_SYNCHRONIZE ?? 'true',
  DB_LOGGING: process.env.DB_LOGGING ?? 'false',
  JWT_SECRET: process.env.JWT_SECRET ?? 'kai-store-lite-dev-jwt-secret',
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ?? 'kai-store-lite-dev-jwt-refresh',
  ENABLE_CACHE: process.env.ENABLE_CACHE ?? 'true',
  ENABLE_SWAGGER: process.env.ENABLE_SWAGGER ?? 'true',
  ENABLE_CORS: process.env.ENABLE_CORS ?? 'true',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? '*',
  LOCAL_STORAGE_PATH:
    process.env.LOCAL_STORAGE_PATH ?? resolve(liteDataDir, 'uploads'),
};

const distMain = resolve(kaiCoreDir, 'dist/main.js');
if (!existsSync(distMain)) {
  console.error(
    `[lite-entrypoint] Missing ${distMain}. Run: cd kai-core && npm run build`,
  );
  process.exit(1);
}
const child = spawn(process.execPath, [distMain], {
  cwd: kaiCoreDir,
  env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
