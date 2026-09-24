#!/usr/bin/env node
/**
 * Build KaiStore Lite .deb via Docker linux/amd64 (for macOS Apple Silicon hosts).
 *
 * Target distro: Debian 12 bookworm (glibc 2.36) — Chromebook Crostini / penguin.
 * Builds frontend on the host, then runs tauri build in Docker (no Node sidecar).
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const liteRoot = resolve(__dirname, '..');
const repoRoot = resolve(liteRoot, '..');
const image =
  process.env.KAI_LITE_LINUX_DEB_IMAGE || 'kai-store-lite-linux-deb:bookworm';
const dockerfile = join(__dirname, 'Dockerfile.linux-deb');
const cargoTarget = resolve(liteRoot, 'src-tauri/target');
const linuxTarget = 'x86_64-unknown-linux-gnu';
const debDir = resolve(cargoTarget, linuxTarget, 'release/bundle/deb');
const forceImage =
  process.env.KAI_LITE_DOCKER_REBUILD === '1' ||
  process.argv.includes('--rebuild-image');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd || liteRoot,
    stdio: 'inherit',
    env: { ...process.env, ...(opts.env || {}) },
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function dockerOk() {
  const r = spawnSync('docker', ['info'], { stdio: 'ignore' });
  return r.status === 0;
}

if (!dockerOk()) {
  console.error(
    '[tauri-build-linux-docker] Docker daemon not running. Open Docker Desktop.',
  );
  process.exit(1);
}

console.log('[tauri-build-linux-docker] building frontend (host)…');
run('npm', ['run', 'build'], { cwd: liteRoot });

console.log('[tauri-build-linux-docker] ensuring docker image', image);
const inspect = spawnSync('docker', ['image', 'inspect', image], {
  stdio: 'ignore',
});
if (inspect.status !== 0 || forceImage) {
  if (forceImage) {
    console.log('[tauri-build-linux-docker] forcing image rebuild…');
  }
  run('docker', [
    'build',
    '--platform',
    'linux/amd64',
    '-t',
    image,
    '-f',
    dockerfile,
    __dirname,
  ]);
}

// Drop previous linux target + host release artifacts so we don't keep
// glibc-2.39-linked build-scripts (from a newer distro) that fail on bookworm.
const hostRelease = resolve(cargoTarget, 'release');
for (const dir of [resolve(cargoTarget, linuxTarget), hostRelease]) {
  if (existsSync(dir)) {
    console.log('[tauri-build-linux-docker] cleaning', dir);
    rmSync(dir, { recursive: true, force: true });
  }
}

mkdirSync(cargoTarget, { recursive: true });
mkdirSync(resolve(liteRoot, 'dist-release'), { recursive: true });

const inner = [
  'set -euo pipefail',
  // pipefail + head can SIGPIPE (141); use sed so writers finish cleanly.
  'echo "[docker] distro:" && sed -n "1,5p" /etc/os-release',
  'echo "[docker] glibc:" && ldd --version 2>&1 | sed -n "1p" || true',
  'echo "[docker] installing linux tauri CLI (host node_modules is darwin)…"',
  'mkdir -p /tmp/kai-tauri-cli',
  'cd /tmp/kai-tauri-cli',
  'npm init -y >/dev/null',
  "npm install --no-audit --no-fund '@tauri-apps/cli@^2'",
  'TAURI_BIN=/tmp/kai-tauri-cli/node_modules/.bin/tauri',
  'cd /workspace/kai-store-lite',
  'export CARGO_TARGET_DIR=/workspace/kai-store-lite/src-tauri/target',
  'unset CI || true',
  `echo "[docker] tauri build ${linuxTarget} deb (bookworm)…"`,
  `"$TAURI_BIN" build --target ${linuxTarget} --bundles deb --ci --config '{"build":{"beforeBuildCommand":""}}'`,
].join('\n');

console.log(
  '[tauri-build-linux-docker] compiling inside linux/amd64 bookworm (qemu — puede tardar)…',
);
run('docker', [
  'run',
  '--rm',
  '--platform',
  'linux/amd64',
  '-v',
  `${repoRoot}:/workspace`,
  '-w',
  '/workspace',
  '-e',
  'CARGO_HOME=/workspace/.cache/cargo-linux-deb',
  '-e',
  'RUSTUP_HOME=/usr/local/rustup',
  image,
  'bash',
  '-lc',
  inner,
]);

if (!existsSync(debDir)) {
  console.error('[tauri-build-linux-docker] deb dir missing:', debDir);
  process.exit(1);
}
const debs = readdirSync(debDir).filter((f) => f.endsWith('.deb'));
if (!debs.length) {
  console.error('[tauri-build-linux-docker] no .deb produced');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(liteRoot, 'package.json'), 'utf8'));
const version = pkg.version || '0.0.0';
const outRoot = resolve(liteRoot, 'dist-release');
mkdirSync(outRoot, { recursive: true });
for (const name of debs) {
  const src = join(debDir, name);
  const dest = join(outRoot, `KaiStore-Lite_${version}_linux-x64-bookworm.deb`);
  copyFileSync(src, dest);
  const destShort = join(outRoot, `KaiStore-Lite_${version}_linux-x64.deb`);
  copyFileSync(src, destShort);
  console.log('[tauri-build-linux-docker] deb:', src);
  console.log('[tauri-build-linux-docker] copied:', dest);
  console.log('[tauri-build-linux-docker] copied:', destShort);
}
