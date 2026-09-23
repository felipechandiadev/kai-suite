# 04 — Arquitectura

Alineado a [07-decisiones-firmadas.md](./07-decisiones-firmadas.md).  
**Opción adoptada: B** (edición Lite de `kai-core`) + sidecar Node + UI Vite.

## Vista lógica

```text
KaiStore Lite (un instalador, una app)
├── Shell Tauri (ventana, tray, title bar, lifecycle)
├── UI Vite + React + @kai/ui
│   ├── Sección POS      → HTTP 127.0.0.1 (Core)
│   ├── Sección Admin    → HTTP 127.0.0.1 (Core)
│   └── Sección Impresoras → invoke Tauri (Rust)
├── Sidecar Node — kai-core edición Lite
│   └── SQLite (app data del SO)
└── Print engine (Rust in-process, compartido con printers)
    └── invoke only (v1)
```

## Capas

| Capa | Rol |
|------|-----|
| **Shell Tauri** | Ventana, title bar, bandeja, permisos, path de datos, arranque/parada del sidecar |
| **Frontend Vite** | Tres secciones; `@kai/ui` completo; IA Admin / paridad POS |
| **Core Lite (sidecar)** | Nest/TypeORM edición Lite; REST local; una empresa; roles |
| **SQLite** | Fuente de verdad (`kai-store-lite.sqlite3` o similar en app data) |
| **Print engine** | ESC/POS / PDF vía `invoke`; sin segundo proceso Printers |

## Datos

- Application Support / AppData de la app.
- Una empresa; sin selector multi-company.
- Uploads/logos en subcarpeta local (no R2 obligatorio en v1).
- Backup/restore desde la UI (copia controlada del SQLite + media asociada).

## Core Lite (detalle)

- Flag `KAI_EDITION=lite` (nombre final a fijar en implementación).
- No registrar módulos: HCM, dining/Food, eShop, delivery, SII fiscal, contabilidad pesada, tesorería bancaria / OE.
- Redis: no requerido → cache in-memory / no-op.
- TypeORM `sqlite`; subset de entidades; migraciones o esquema Lite (spike: `jsonb`, SQL crudo Postgres).
- Auth: usuarios y roles en SQLite (single company).

## Impresión

- Crate/módulo compartido factorizado desde `kai-printers-desktop`.
- POS/Admin no dependen de WS LAN en v1.
- Sección Impresoras: mapeo y pruebas vía `invoke`.

## Red / multi-caja

v1: **un PC = fuente de verdad**. No compartir el archivo SQLite entre dos equipos.

## Opciones descartadas

| Opción | Motivo de descarte |
|--------|-------------------|
| A — Sidecar Next admin/pos | Rompe una ventana Vite + `@kai/ui` unificado |
| C — Core mínimo nuevo | No alcanza paridad Admin/POS + recepciones a tiempo con calidad suite |
| Print solo WS externo | Segunda app; contradice “una sola app” + `invoke` |
