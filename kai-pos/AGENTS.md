<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Regla de UI (kai-pos)

- **Primitivos:** importar desde `@kai/ui`.
  - Ejemplo: `import { Button, TextField, Dialog } from "@kai/ui";`
- **Prohibido** duplicar Button, TextField, Select, Dialog, Alert, DataGrid, etc. en `kai-pos`.
- Excepción: shells POS (`PosTopBar`) y dominio ERP (compras, impresión).

## POS offline (`src/features/pos-offline`)

- Ventas offline usan **IndexedDB (Dexie)** y sync directo al API Nest (`POST /api/pos/sync/commands`, `GET /api/health`) con Bearer de sesión NextAuth desde el **cliente** (no Server Actions).
- Heartbeat de conectividad y cola de sync viven en `pos-offline`; el badge de topbar es independiente del WiFi del agente de impresión.
- Al abrir sesión de caja se descargan `offline-fiscal-pack` y `offline-catalog-snapshot` (catálogo paginado en Dexie `catalog`).
- **Riesgo operativo MVP**: el CAF (`RSASK`) queda en IndexedDB hasta logout o TTL del pack; no loguear ni exportar el pack. Al cerrar sesión se purga `fiscal_pack` y catálogo del POS activo.

