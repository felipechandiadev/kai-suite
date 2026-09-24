# Fase 09 — Packaging

## Backend (S4 — sqlx in-process)

Runtime: **Rust sqlx in-process** vía `invoke("lite_*")`. Sin sidecar Node, sin `KAI_LITE_BACKEND`, sin `resources/sidecar`. Track: [`../../rust-lite/README.md`](../../rust-lite/README.md).

## Checklist
- [x] SemVer en `package.json` + `tauri.conf.json`
- [x] Targets DMG (macOS aarch64) + MSI (Windows x64) + DEB (Linux x64) en `tauri.conf.json`
- [x] Scripts `tauri:build:mac` / `tauri:build:windows` / `tauri:build:linux` / `package:release` (sin stage sidecar)
- [x] Scripts `stage:sidecar:*` / `lite-entrypoint` eliminados
- [x] Bundle id `com.kaistore.lite`
- [x] Icons pipeline `scripts/generate-app-icons.mjs` (+ `tauri icon` para ICO real)
- [x] Paths por OS: macOS Application Support / Windows APPDATA / Linux XDG `~/.local/share`
- [x] Bundle slim sin Node (rust-lite)

## Mac Apple Silicon (release local)

```bash
cd kai-store-lite
npm run tauri:build:mac
```

Artefactos:

- `.app`: `src-tauri/target/aarch64-apple-darwin/release/bundle/macos/KaiStore Lite.app`
- `.dmg`: `src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/KaiStore Lite_<ver>_aarch64.dmg`

Smoke:

1. Abrir el `.app` o montar el `.dmg`.
2. Health en UI → `edition: lite-rust` (sin proceso en `:4100`).
3. Login `admin` / `admin1234` + catálogo POS; DB en `~/Library/Application Support/KaiStore Lite/business.sqlite`.

## Windows x64

```bash
cd kai-store-lite
npm run tauri:build:windows
```

Portable: `dist-release/KaiStore-Lite_<ver>_windows-x64.zip` (sin carpeta `sidecar/`).

## Linux x64 / Chromebook (Crostini)

Target: Debian 12 (bookworm) — glibc 2.36.

```bash
cd kai-store-lite
npm run tauri:build:linux:docker
```

Artefacto: `dist-release/KaiStore-Lite_<ver>_linux-x64-bookworm.deb`

### Smoke completo

1. Abrir app; health UI → `edition: lite-rust` (sin Node / sin `:4100`).
2. Activar licencia / trial.
3. Login admin + POS; catálogo y una venta.
4. DB en `~/.local/share/KaiStore Lite/business.sqlite`.
5. Impresoras / ticket.
6. Cierre de caja.
7. Sin `EACCES logs/` ni `@kai/fiscal-ted`.
