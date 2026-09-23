# Fase 09 — Packaging

## Checklist
- [x] SemVer `0.1.0` en `package.json` + `tauri.conf.json`
- [x] Targets DMG (macOS aarch64) + MSI (Windows x64) en `tauri.conf.json`
- [x] Scripts `tauri:build:mac` / `tauri:build:windows` / `package:release`
- [x] Fila en `docs/apps/VERSIONS.md` + path map
- [x] Bundle id `com.kaistore.lite`
- [x] Icons pipeline `scripts/generate-app-icons.mjs`

## Build (manual en máquina CI / host)

```bash
cd kai-store-lite
npm run tauri:build:mac      # → bundle/dmg
npm run tauri:build:windows # → bundle/msi (host Windows o cross)
npm run package:release
```

Sidecar Node: empaquetar `lite-entrypoint.mjs` + `kai-core/dist` como resource (seguir hallazgos fase 03).
