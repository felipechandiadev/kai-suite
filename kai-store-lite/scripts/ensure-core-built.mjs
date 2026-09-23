#!/usr/bin/env node
/**
 * Ensures kai-core/dist is built (and fresh) before Tauri dev/build.
 * Rebuilds when dist is missing or older than kai-core/src.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');
const kaiCoreDir = resolve(repoRoot, 'kai-core');
const distMain = resolve(kaiCoreDir, 'dist/main.js');
const srcDir = resolve(kaiCoreDir, 'src');

function latestMtime(dir) {
  let latest = 0;
  const walk = (d) => {
    for (const name of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, name.name);
      if (name.isDirectory()) {
        if (name.name === 'node_modules' || name.name === 'dist') continue;
        walk(p);
        continue;
      }
      if (!/\.(ts|js)$/.test(name.name)) continue;
      try {
        latest = Math.max(latest, statSync(p).mtimeMs);
      } catch {
        /* ignore */
      }
    }
  };
  walk(d);
  return latest;
}

function needsRebuild() {
  if (!existsSync(distMain)) return true;
  if (!existsSync(srcDir)) return false;
  try {
    const distTime = statSync(distMain).mtimeMs;
    return latestMtime(srcDir) > distTime;
  } catch {
    return true;
  }
}

if (!needsRebuild()) {
  process.exit(0);
}

console.log('[kai-store-lite] Building kai-core (missing or stale dist)…');
const r = spawnSync('npm', ['run', 'build'], {
  cwd: kaiCoreDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (r.status !== 0) {
  console.error('[kai-store-lite] kai-core build failed — sidecar cannot start.');
  process.exit(r.status ?? 1);
}

if (!existsSync(distMain)) {
  console.error('[kai-store-lite] Missing kai-core/dist/main.js after build.');
  process.exit(1);
}
