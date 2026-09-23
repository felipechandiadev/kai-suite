# Fase 07 — POS paridad

## Objetivo
Flujos de [`02-rutas-pos.md`](../02-rutas-pos.md); ticket sale/closing vía invoke.

## Archivos
- [x] Todo `src/sections/pos/**` según mod-pos.md
- [x] Print: `ticket_sale*`, `ticket_cash_closing*`, `ticket_payment_in*`
- [x] `section-state.store` snapshot carrito

## Done
Login→opening→sell→payment→ticket; crédito interno; cierre+ticket; estado preservado al cambiar sección.
