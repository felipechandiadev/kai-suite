# Renderer: `pos-cash-closing-ticket`

**Estado Android:** 📋 por implementar → `PosCashClosingTicketEscPos.kt`  
**Versión payload:** `POS_CASH_CLOSING_TICKET_PAYLOAD_VERSION = 1`

## Payload

Fuente: `packages/print-service-client/src/pos-cash-closing-ticket.ts`

| Campo | Tipo | Notas |
|-------|------|-------|
| `version` | number | |
| `cashSessionId` | string | Folio corto (8 chars) en encolado |
| `sessionOpenedAt` | string \| null | |
| `closedAt` | string | |
| `company` | object | |
| `branchName` | string \| null | |
| `pointOfSaleName` | string \| null | |
| `operatorName` | string \| null | |
| `usedBlindCount` | boolean | Texto «conteo ciego» si aplica |
| `counted` | object | `cash`, `debitCard`, `creditCard`, `transfer`, `check`, `other` |
| `countedGrand` | number | Total contado |
| `systemCashExpected` | number? | Esperado sistema |
| `difference` | number? | Diferencia |
| `salesTotal` | number? | Ventas sesión |
| `notes` | string \| null | |
| `message` | string \| null | Mensaje cierre |

## Layout ESC/POS (orden — paridad Tauri)

Referencia: `print-service/src-tauri/src/pos_cash_closing_ticket_escpos.rs`  
HTML: `pwa-pos/src/features/cash-closing/lib/cash-closing-receipt-print.ts`

1. Logo
2. Encabezado empresa (centrado, doble altura)
3. **ARQUEO DE CAJA** / «Cierre de sesion»
4. Origen (sucursal · POS), operador
5. Fechas apertura y cierre
6. **Conteo declarado** — filas con monto &gt; 0:
   - Efectivo, Tarjeta débito, Tarjeta crédito, Transferencia, Cheque, Otros
7. **Total contado** (bold)
8. Si hay datos sistema: esperado efectivo, diferencia, total ventas
9. Notas / mensaje (wrap)
10. Sin barcode (no en Tauri)
11. Corte

### Filas de conteo

Solo imprimir medios con monto &gt; ~0.01 CLP (igual que Rust).

## Encolado

`cash-closing/lib/cash-closing-ticket-agent.ts`  
Capability: `agentSupportsPosCashClosingTicket`

## Ejemplo JSON mínimo

```json
{
  "version": 1,
  "cashSessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "sessionOpenedAt": "2026-06-24T08:00:00.000Z",
  "closedAt": "2026-06-24T20:00:00.000Z",
  "company": { "razonSocial": "Demo SpA", "nombreFantasia": null, "rut": null, "businessActivity": null },
  "branchName": "Centro",
  "pointOfSaleName": "Caja 1",
  "operatorName": "María",
  "usedBlindCount": false,
  "counted": { "cash": 50000, "debitCard": 120000, "creditCard": 0, "transfer": 0, "check": 0, "other": 0 },
  "countedGrand": 170000,
  "systemCashExpected": 48000,
  "difference": 2000,
  "salesTotal": 350000,
  "notes": null,
  "message": null
}
```

## Checklist implementación

- [ ] `PosCashClosingTicketEscPos.kt`
- [ ] Dispatcher + capability hello
- [ ] Tests unitarios
- [ ] `waitForPrintJob` en `cash-closing-ticket-agent.ts`
- [ ] QA: cerrar caja e imprimir arqueo en tablet

## Riesgo con renderer de venta

No hay `folio` ni `lines` de producto; el ticket sale casi vacío o con datos incorrectos.
