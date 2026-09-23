# Fase 03 — Core Lite + SQLite + sidecar

## Objetivo
Sidecar Nest responde health; DB sqlite en app data.

## Archivos Lite
- [x] `src-tauri/src/sidecar/spawn.rs`, `health.rs`, `mod.rs`
- [x] `commands/sidecar_cmd.rs`
- [x] `src/lib/http.ts`, `useCoreHealth.ts`
- [x] `.env.example` CORE_PORT

## Archivos kai-core
- [x] Flag `KAI_EDITION=lite` en schema/config
- [x] typeorm sqlite + entity subset
- [x] cache memory adapter
- [x] entrypoint empaquetable `scripts/lite-entrypoint.mjs` (o bin)

## Done
`sidecar_start` → GET `/api/health` ok desde UI.

## No hacer
Seed completo, módulos OUT registrados.
