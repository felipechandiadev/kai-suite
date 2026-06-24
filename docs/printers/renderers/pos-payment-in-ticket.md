# Renderer: `pos-payment-in-ticket`

**Estado Android:** 📋 por implementar → `PosPaymentInTicketEscPos.kt`  
**Versión payload:** `POS_PAYMENT_IN_TICKET_PAYLOAD_VERSION = 1`

## Descripción

Comprobante de **cobro a cliente** (cuentas por cobrar / PAYMENT_IN). Uso principal en **pwa-admin**; el protocolo es el mismo para cualquier cliente WebSocket.

## Payload

Fuente: `packages/print-service-client/src/pos-payment-in-ticket.ts`

| Campo | Tipo | Notas |
|-------|------|-------|
| `version` | number | |
| `documentNumber` | string | Folio cobro; **barcode** |
| `issuedAt` | string | |
| `company` | object | |
| `customerName` | string \| null | |
| `customerDocument` | string \| null | |
| `branchName` | string \| null | |
| `pointOfSaleName` | string \| null | |
| `operatorName` | string \| null | |
| `totalCollected` | number | Total aplicado |
| `amountPaid` | number | Monto recibido |
| `payments[]` | | `label`, `amount`, `reference` |
| `allocations[]` | | `documentNumber`, `amount` — ventas aplicadas |
| `notes` | string \| null | |
| `externalReference` | string \| null | |

## Layout ESC/POS (orden — paridad Tauri)

Referencia: `print-service/src-tauri/src/pos_payment_in_ticket_escpos.rs`  
Admin HTML: `pwa-admin/src/features/sales-payments/print/`

1. Logo
2. Empresa
3. **COMPROBANTE DE COBRO** (o título equivalente en Rust)
4. `documentNumber`, fecha
5. Cliente (nombre, documento)
6. Origen, operador
7. **Total cobrado** / **Monto recibido** (según Rust)
8. Sección **Medios de pago** — filas con monto &gt; 0 + referencia indentada
9. Sección **Aplicado a ventas** — doc + monto por allocation
10. Notas / referencia externa (wrap)
11. Barcode `documentNumber`
12. Corte

## Encolado

| App | Archivo |
|-----|---------|
| Admin | `pwa-admin/.../admin-payment-in-ticket-print.ts` |

Capability: `agentSupportsPosPaymentInTicket`

## Ejemplo JSON

```json
{
  "version": 1,
  "documentNumber": "COB-2026-0100",
  "issuedAt": "2026-06-24T11:00:00.000Z",
  "company": { "razonSocial": "Demo SpA", "nombreFantasia": null, "rut": null, "businessActivity": null },
  "customerName": "Empresa Cliente SA",
  "customerDocument": "99.888.777-6",
  "branchName": null,
  "pointOfSaleName": null,
  "operatorName": "Ana",
  "totalCollected": 80000,
  "amountPaid": 80000,
  "payments": [{ "label": "Transferencia", "amount": 80000, "reference": "TRX-998877" }],
  "allocations": [
    { "documentNumber": "VTA-2026-0500", "amount": 50000 },
    { "documentNumber": "VTA-2026-0501", "amount": 30000 }
  ],
  "notes": null,
  "externalReference": null
}
```

## Checklist implementación

- [ ] `PosPaymentInTicketEscPos.kt`
- [ ] Secciones pagos y allocations (omitir vacías)
- [ ] Tests + dispatcher + capability
- [ ] QA desde admin con agente en misma red (opcional tablet)

## Prioridad

Fase 3 del [plan maestro](../RENDERERS-ESC-POS.md) — menor frecuencia en POS tablet que cotización/arqueo.

## Riesgo con renderer de venta

Interpreta mal `documentNumber`, ignora allocations; barcode incorrecto o ausente.
