# Renderer: `pos-customer-credit-note-ticket`

**Estado Android:** 📋 por implementar → `PosCustomerCreditNoteTicketEscPos.kt`  
**Versión payload:** `POS_CUSTOMER_CREDIT_NOTE_TICKET_PAYLOAD_VERSION = 1`

## Payload

Fuente: `packages/print-service-client/src/pos-customer-credit-note-ticket.ts`

| Campo | Tipo | Notas |
|-------|------|-------|
| `version` | number | |
| `creditNoteFolio` | string | Folio NC; **barcode** |
| `saleReturnFolio` | string | Devolución asociada |
| `originalSaleFolio` | string | Venta origen |
| `issuedAtIso` | string | |
| `company` | object | |
| `branchName` | string \| null | |
| `pointOfSaleName` | string \| null | |
| `customerName` | string \| null | |
| `customerDocument` | string \| null | |
| `lines[]` | | `productName`, `attributes[]`, `quantity`, `unitPriceWithTax`, `lineTotal` |
| `totals` | | `subtotalNet`, `taxes`, `discounts`, `total` |
| `refundMode` | `document` \| `immediate` | Texto modo devolución |
| `refundPayments[]` | | `label`, `amount` — si devolución inmediata |

## Layout ESC/POS (orden — paridad Tauri)

Referencia: `print-service/src-tauri/src/pos_customer_credit_note_ticket_escpos.rs`  
HTML: `pwa-pos/src/features/customer-credit-notes/lib/customer-credit-note-receipt-print.ts`

1. Logo
2. Empresa + RUT
3. **NOTA DE CREDITO** (bold, centrado)
4. Fecha, folio NC, folio devolución, venta original
5. Cliente
6. Origen sucursal · POS
7. Líneas producto (nombre + atributos, qty × precio, total línea)
8. Totales: neto, impuestos, descuentos, **Monto NC** bold
9. Modo devolución (`document` / `immediate`)
10. **Devolución** — medios si `refundPayments` con montos
11. Barcode `creditNoteFolio`
12. Corte

### Nombre de línea

`productName` + atributos unidos con ` · ` (igual venta).

## Encolado

`customer-credit-notes/lib/customer-credit-note-ticket-agent.ts`  
Capability: `agentSupportsPosCustomerCreditNoteTicket`

## Ejemplo JSON mínimo

```json
{
  "version": 1,
  "creditNoteFolio": "NC-2026-0042",
  "saleReturnFolio": "DEV-2026-0010",
  "originalSaleFolio": "VTA-2026-0999",
  "issuedAtIso": "2026-06-24T15:00:00.000Z",
  "company": { "razonSocial": "Demo SpA", "nombreFantasia": null, "rut": "76.111.111-1", "businessActivity": null },
  "branchName": null,
  "pointOfSaleName": null,
  "customerName": "Juan Pérez",
  "customerDocument": "11.222.333-4",
  "lines": [{
    "productName": "Cadena plata",
    "attributes": ["45 cm"],
    "quantity": 1,
    "unitPriceWithTax": 25000,
    "lineTotal": 25000
  }],
  "totals": { "subtotalNet": 21008, "taxes": 3992, "discounts": 0, "total": 25000 },
  "refundMode": "immediate",
  "refundPayments": [{ "label": "Efectivo", "amount": 25000 }]
}
```

## Checklist implementación

- [ ] `PosCustomerCreditNoteTicketEscPos.kt`
- [ ] Dispatcher + capability
- [ ] Tests (+ `customerName: null`)
- [ ] `waitForPrintJob` en ticket-agent
- [ ] QA: emitir NC en POS e imprimir

## Riesgo con renderer de venta

Busca `folio` en raíz; NC usa `creditNoteFolio`. Líneas usan `lineTotal` no `lineGross`.
