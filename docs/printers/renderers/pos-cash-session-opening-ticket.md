# Renderer: `pos-cash-session-opening-ticket`

**Estado Android:** 📋 por implementar → `PosCashSessionOpeningTicketEscPos.kt`  
**Versión payload:** `POS_CASH_SESSION_OPENING_TICKET_PAYLOAD_VERSION = 1`

## Payload

Fuente: `packages/print-service-client/src/pos-cash-session-opening-ticket.ts`

| Campo | Tipo | Notas |
|-------|------|-------|
| `version` | number | |
| `cashSessionId` | string | Mostrar 8 chars mayúsculas |
| `openedAt` | string | |
| `openingAmount` | number | Monto fondo inicial — **destacado** |
| `company` | object | |
| `branchName` | string \| null | |
| `pointOfSaleName` | string \| null | |
| `operatorName` | string \| null | |
| `cashHubName` | string \| null | Centro de efectivo |

## Layout ESC/POS (orden — paridad Tauri)

Referencia: `print-service/src-tauri/src/pos_cash_session_opening_ticket_escpos.rs`  
HTML: `pwa-pos/src/features/cash-session-opening/lib/cash-session-opening-print.ts`

1. Logo
2. Empresa (centrado)
3. **APERTURA DE CAJA** / «Inicio de sesion»
4. Origen, operador, sesión (corto), fecha apertura, centro efectivo
5. Divider
6. **Monto apertura:** $XXX (bold)
7. Divider
8. Centrado: «Sesion de caja abierta»
9. Sin barcode
10. Corte

## Encolado

`cash-session-opening/lib/cash-session-opening-ticket-agent.ts`  
Capability: `agentSupportsPosCashSessionOpeningTicket`

## Ejemplo JSON

```json
{
  "version": 1,
  "cashSessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "openedAt": "2026-06-24T08:00:00.000Z",
  "openingAmount": 50000,
  "company": { "razonSocial": "Demo SpA", "nombreFantasia": "Tienda Demo", "rut": null, "businessActivity": null },
  "branchName": "Centro",
  "pointOfSaleName": "Caja 1",
  "operatorName": "Pedro",
  "cashHubName": null
}
```

## Checklist implementación

- [ ] `PosCashSessionOpeningTicketEscPos.kt`
- [ ] Formato sesión: primeros 8 caracteres UUID en mayúsculas
- [ ] Tests + dispatcher + capability
- [ ] `waitForPrintJob` en opening ticket-agent
- [ ] QA: abrir caja e imprimir

## Riesgo con renderer de venta

No muestra monto apertura ni título APERTURA DE CAJA.
