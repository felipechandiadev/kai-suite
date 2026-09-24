#!/usr/bin/env node
/**
 * macOS Apple Silicon release build.
 * Forces CARGO_TARGET_DIR into src-tauri/target (avoids Cursor sandbox cargo cache)
 * and produces .app + .dmg under that tree.
 */
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const liteRoot = resolve(__dirname, '..');
const cargoTarget = resolve(liteRoot, 'src-tauri/target');

const env = {
  ...process.env,
  CARGO_TARGET_DIR: cargoTarget,
};

console.log('[tauri-build-mac] CARGO_TARGET_DIR=', cargoTarget);
const r = spawnSync(
  'npx',
  ['tauri', 'build', '--target', 'aarch64-apple-darwin'],
  { cwd: liteRoot, env, stdio: 'inherit', shell: process.platform === 'win32' },
);
process.exit(r.status ?? 1);
