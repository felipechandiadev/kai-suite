# 00 — Convenciones

## Capas

| Capa | Path raíz | Runtime |
|------|-----------|---------|
| UI | `kai-store-lite/src/` | Vite + React 19 |
| Shell nativo | `kai-store-lite/src-tauri/` | Tauri 2 + Rust |
| Core Lite | `kai-core/` con `KAI_EDITION=lite` (sidecar) | Nest + TypeORM + SQLite |
| Emisión | `kai-store-lite/scripts/` | Node CLI (clave privada fuera del repo o env) |
| UI kit | `packages/ui` | `@kai/ui` (adaptado Vite) |

## Routing UI

- Router: **React Router v7** (o equivalente) dentro de cada sección.
- Prefijos de ruta:
  - `/license/*` — activación / bloqueo trial
  - `/admin/*` — backoffice
  - `/pos/*` — caja
  - `/printers/*` — impresoras
- La **sección activa** (POS \| Admin \| Impresoras) la controla el shell Tauri/React; el router anida bajo esa sección.

## Nombres de archivos

| Patrón | Uso |
|--------|-----|
| `*Page.tsx` | Pantalla de ruta |
| `*Panel.tsx` | Contenido principal de colección |
| `*Dialog.tsx` | Diálogo crear/actualizar |
| `*.api.ts` | Cliente HTTP → Core (`fetch` + Bearer) |
| `*.types.ts` | Tipos TS |
| `use*.ts` | Hooks |
| `*.rs` | Módulo Rust; funciones `pub fn` / `#[tauri::command]` |

## Funciones documentadas

En `modulos/` cada archivo lista:

- **export / command** — nombre exacto previsto
- **rol** — una línea
- **llamado desde** — quién lo usa

Si al implementar se renombra, actualizar el módulo correspondiente en el mismo PR.

## Criterio Done de un archivo

1. Existe en el path del árbol.  
2. Exports documentados implementados (o marcados `// TODO phase N` con issue).  
3. Cubierto por la fase que lo introduce.  
4. Typecheck / clippy según capa.
