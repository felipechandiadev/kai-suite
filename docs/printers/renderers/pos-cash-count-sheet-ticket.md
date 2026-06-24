# Renderer: `pos-cash-count-sheet-ticket`

**Estado Android:** 📋 por implementar → `PosCashCountSheetTicketEscPos.kt`  
**Versión payload:** `POS_CASH_COUNT_SHEET_TICKET_PAYLOAD_VERSION = 1`

## Descripción

Planilla **en blanco** para anotar montos a mano en cierre de caja (líneas con guiones `____`). No lleva montos del sistema salvo metadatos de sesión.

## Payload

Fuente: `packages/print-service-client/src/pos-cash-count-sheet-ticket.ts`

| Campo | Tipo | Notas |
|-------|------|-------|
| `version` | number | |
| `cashSessionId` | string | |
| `sessionOpenedAt` | string \| null | |
| `printedAt` | string | |
| `company` | object | |
| `branchName` | string \| null | |
| `pointOfSaleName` | string \| null | |
| `operatorName` | string \| null | |
| `paymentLines[]` | | Solo `{ "label": "Efectivo" }` — etiquetas a listar |

Si `paymentLines` vacío, usar defaults: Efectivo, Tarjeta débito, Tarjeta crédito, Transferencia, Cheque, Otros (igual Tauri).

## Layout ESC/POS (orden — paridad Tauri)

Referencia: `print-service/src-tauri/src/pos_cash_count_sheet_ticket_escpos.rs`  
HTML: `pwa-pos/src/features/cash-closing/lib/cash-count-sheet-print.ts`

1. Logo
2. Empresa
3. **PLANILLA DE CONTEO** / «Cierre de caja — anotar montos»
4. Origen, operador, sesión (8 chars), apertura, fecha impresión
5. Divider
6. Por cada medio de pago: `Etiqueta: ________________________________` (wrap labelValue)
7. Línea **Total:** con guiones
8. Pie «Complete los montos y conserve el comprobante»
9. Sin barcode
10. Corte

## Encolado

`cash-closing/lib/cash-count-sheet-ticket-agent.ts`  
Capability: `agentSupportsPosCashCountSheetTicket`

## Ejemplo JSON

```json
{
  "version": 1,
  "cashSessionId": "session-uuid-here",
  "sessionOpenedAt": "2026-06-24T08:00:00.000Z",
  "printedAt": "2026-06-24T19:55:00.000Z",
  "company": { "razonSocial": "Demo SpA", "nombreFantasia": null, "rut": null, "businessActivity": null },
  "branchName": "Centro",
  "pointOfSaleName": "Caja 1",
  "operatorName": null,
  "paymentLines": [
    { "label": "Efectivo" },
    { "label": "Tarjeta débito" }
  ]
}
```

## Checklist implementación

- [ ] `PosCashCountSheetTicketEscPos.kt`
- [ ] Constante `WRITABLE_FILL` / `appendWritableLine`
- [ ] Defaults de 6 medios si array vacío
- [ ] Tests + dispatcher + capability
- [ ] QA desde pantalla arqueo POS

## Riesgo con renderer de venta

Imprime sección PAGOS con montos $0 en lugar de líneas en blanco.
