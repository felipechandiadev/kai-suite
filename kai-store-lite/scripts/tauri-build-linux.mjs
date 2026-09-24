#!/usr/bin/env node
/**
 * Linux x64 (.deb) release build for Chromebook Crostini / Debian.
 * Runs tauri build for x86_64-unknown-linux-gnu (no Node sidecar).
 *
 * Requires a Linux x64 host (WebKitGTK). On macOS use tauri:build:linux:docker.
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
  readFileSync,
} from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const liteRoot = resolve(__dirname, '..');
const cargoTarget = resolve(liteRoot, 'src-tauri/target');
const linuxTarget = 'x86_64-unknown-linux-gnu';

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: liteRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (process.platform !== 'linux') {
  console.error(
    '[tauri-build-linux] tauri build for Linux requires a Linux x64 host (WebKitGTK).',
  );
  console.error(
    '[tauri-build-linux] On macOS use: npm run tauri:build:linux:docker',
  );
  process.exit(1);
}

const env = {
  ...process.env,
  CARGO_TARGET_DIR: cargoTarget,
};

const args = [
  'tauri',
  'build',
  '--target',
  linuxTarget,
  '--bundles',
  'deb',
];

console.log('[tauri-build-linux] CARGO_TARGET_DIR=', cargoTarget);
console.log('[tauri-build-linux] npx', args.join(' '));
run('npx', args, { env });

const debDir = resolve(cargoTarget, linuxTarget, 'release/bundle/deb');
if (!existsSync(debDir)) {
  console.error('[tauri-build-linux] deb bundle dir missing:', debDir);
  process.exit(1);
}

const debs = readdirSync(debDir).filter((f) => f.endsWith('.deb'));
if (debs.length === 0) {
  console.error('[tauri-build-linux] no .deb in', debDir);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(liteRoot, 'package.json'), 'utf8'));
const version = pkg.version || '0.0.0';
const outRoot = resolve(liteRoot, 'dist-release');
mkdirSync(outRoot, { recursive: true });

for (const name of debs) {
  const src = join(debDir, name);
  const dest = join(outRoot, `KaiStore-Lite_${version}_linux-x64.deb`);
  copyFileSync(src, dest);
  console.log('[tauri-build-linux] deb:', src);
  console.log('[tauri-build-linux] copied:', dest);
}
