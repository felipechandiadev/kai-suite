# 04 — Arquitectura

Alineado a [07-decisiones-firmadas.md](./07-decisiones-firmadas.md).  
**Runtime actual (S4):** Tauri + UI Vite + backend Lite **in-process** (Rust + sqlx + SQLite). Sin sidecar Node.

## Vista lógica

```text
KaiStore Lite (un instalador, una app)
├── Shell Tauri (ventana, tray, title bar, lifecycle, pool sqlx)
├── UI Vite + React + @kai/ui
│   ├── Sección POS      → invoke("lite_*")
│   ├── Sección Admin    → invoke("lite_*")
│   └── Sección Impresoras → invoke Tauri (print)
├── Lite backend (Rust in-process, sqlx)
│   └── SQLite (app data del SO: business.sqlite)
└── Print engine (Rust in-process)
    └── invoke only (v1)
```

## Capas

| Capa | Rol |
|------|-----|
| **Shell Tauri** | Ventana, title bar, bandeja, permisos, path de datos, pool sqlx |
| **Frontend Vite** | Tres secciones; `@kai/ui`; `liteFetch` → `invoke` |
| **Lite backend** | Commands `lite_*`; sqlx; una empresa; roles |
| **SQLite** | Fuente de verdad (`business.sqlite` en app data) |
| **Print engine** | ESC/POS / PDF vía `invoke`; sin segundo proceso Printers |

## Datos

- Application Support / AppData / XDG de la app.
- Una empresa; sin selector multi-company.
- Uploads/logos en subcarpeta local (no R2 obligatorio en v1).
- Backup/restore desde la UI (copia controlada del SQLite).

## Red / multi-caja

v1: **un PC = fuente de verdad**. No compartir el archivo SQLite entre dos equipos.

## Track rust-lite

Detalle de migración y matriz: [`rust-lite/README.md`](./rust-lite/README.md).

## Opciones descartadas

| Opción | Motivo de descarte |
|--------|-------------------|
| A — Sidecar Next admin/pos | Rompe una ventana Vite + `@kai/ui` unificado |
| B — Sidecar Nest (histórico) | Empaquetado pesado; reemplazado por sqlx in-process (S4) |
| C — Core mínimo nuevo | No alcanza paridad Admin/POS a tiempo |
| Print solo WS externo | Segunda app; contradice “una sola app” + `invoke` |
