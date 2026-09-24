#!/usr/bin/env node
/**
 * Windows x64 release build helper.
 * Runs tauri build for x86_64-pc-windows-msvc (no Node sidecar).
 *
 * From macOS/Linux this uses cargo-xwin as the Cargo runner.
 * MSI/NSIS installers usually need a Windows host (WiX/NSIS). Cross-builds from
 * macOS use --no-bundle and then pack a portable zip (exe + icons).
 * Pass KAI_LITE_WIN_BUNDLES=msi on Windows for an installer.
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  cpSync,
  rmSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const liteRoot = resolve(__dirname, '..');
const cargoTarget = resolve(liteRoot, 'src-tauri/target');
const winTarget = 'x86_64-pc-windows-msvc';
const releaseDir = resolve(cargoTarget, winTarget, 'release');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: liteRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const env = {
  ...process.env,
  CARGO_TARGET_DIR: cargoTarget,
};

const args = ['tauri', 'build', '--target', winTarget];

if (process.platform !== 'win32') {
  args.push('--runner', 'cargo-xwin');
}

const bundles = process.env.KAI_LITE_WIN_BUNDLES;
const portable =
  bundles === 'none' || (!bundles && process.platform !== 'win32');
if (portable) {
  args.push('--no-bundle');
} else if (bundles) {
  for (const b of bundles.split(',').map((s) => s.trim()).filter(Boolean)) {
    args.push('--bundles', b);
  }
} else {
  args.push('--bundles', 'msi');
}

console.log('[tauri-build-windows] CARGO_TARGET_DIR=', cargoTarget);
console.log('[tauri-build-windows] npx', args.join(' '));
run('npx', args, { env });

const exeCandidates = [
  join(releaseDir, 'kai-store-lite.exe'),
  join(releaseDir, 'KaiStore Lite.exe'),
];
const exe = exeCandidates.find((p) => existsSync(p));
if (!exe) {
  console.error('[tauri-build-windows] exe not found in', releaseDir);
  process.exit(1);
}
console.log('[tauri-build-windows] exe:', exe);

if (portable) {
  const pkg = JSON.parse(readFileSync(join(liteRoot, 'package.json'), 'utf8'));
  const version = pkg.version || '0.0.0';
  const outRoot = resolve(liteRoot, 'dist-release');
  const portableName = `KaiStore-Lite_${version}_windows-x64`;
  const portableDir = join(outRoot, portableName);
  const zipPath = join(outRoot, `${portableName}.zip`);

  mkdirSync(outRoot, { recursive: true });
  rmSync(portableDir, { recursive: true, force: true });
  mkdirSync(portableDir, { recursive: true });

  cpSync(exe, join(portableDir, 'KaiStore Lite.exe'));

  const tray = join(liteRoot, 'src-tauri/icons/tray-icon.png');
  if (existsSync(tray)) {
    mkdirSync(join(portableDir, 'icons'), { recursive: true });
    cpSync(tray, join(portableDir, 'icons/tray-icon.png'));
  }

  writeFileSync(
    join(portableDir, 'README.txt'),
    [
      `KaiStore Lite ${version} — Windows x64 (portable)`,
      '',
      '1. Extrae esta carpeta completa (no muevas solo el .exe).',
      '2. Ejecuta "KaiStore Lite.exe".',
      '3. Backend Lite es in-process (sqlx); no requiere Node sidecar.',
      '',
      'Para un instalador MSI, construye en un PC Windows con WiX:',
      '  npm run tauri:build:windows',
      '',
    ].join('\r\n'),
  );

  console.log('[tauri-build-windows] packing zip…');
  rmSync(zipPath, { force: true });
  run('zip', ['-r', zipPath, portableName], { cwd: outRoot });
  console.log('[tauri-build-windows] wrote', zipPath);
}
