# Fase 08 — Compras / recepciones E2E

## Objetivo
Recepción Admin + POS → stock ↑ → venta → stock ↓.

## Archivos
- [x] Completar `receptions` Admin + `NewReceptionPage` POS
- [x] Pagos proveedor desde caja (`ap.api` / payments)
- [x] `ticket` opcional recepción si aplica
- [x] Tests manuales documentados en este file

## Done
Flujo compra completo sin banco; solo caja POS.

## Checklist manual (recepción → venta → stock)

Prerrequisitos: Core Lite en `:4100`, UI Vite o `tauri:dev`, seed ejecutado (`POST /api/lite/seed` o Admin → Acerca de).

1. **Login Admin** (Bearer vía login Lite).
2. **Catálogo** (`/admin/catalog`) — ver variantes PHYSICAL / SERVICE / PACK.
3. **Stock inicial** (`/admin/stock`) — anotar `physicalStock` del PHYSICAL.
4. **Recepción** (`/admin/receipts`):
   - Proveedor: texto libre (ej. `Proveedor demo`)
   - Variante: dropdown del catálogo (PHYSICAL)
   - Qty: `10` → **Registrar recepción**
   - Debe mostrar `Recepción OK · id …` (si Core offline → error visible, **no** “simulado OK”).
5. **Stock** otra vez — PHYSICAL debe subir `+10`.
6. **POS**: login `admin` / `admin1234` → apertura de caja (primer POS) → venta del PHYSICAL qty `2` → cobro CASH.
7. **Stock** — PHYSICAL debe bajar `−2` respecto al post-recepción.
8. **Cierre de caja** — cierra sesión vía API + ticket cierre en print-outbox.

Fallos esperados si falten endpoints Core (`/lite/stock`, `/lite/cash-sessions`, …): mensaje de error en UI, sin datos demo silenciosos.
