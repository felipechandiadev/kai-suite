# Renderer: `pos-sale-ticket`

**Estado Android:** ✅ implementado (`PosSaleTicketEscPos.kt`)  
**Versión payload:** `POS_SALE_TICKET_PAYLOAD_VERSION = 1`

## Payload

Fuente: `packages/print-service-client/src/pos-sale-ticket.ts`

| Campo | Tipo | Notas |
|-------|------|-------|
| `version` | `1` | |
| `folio` | string | Barcode CODE128 |
| `issuedAtIso` | string | Fecha/hora |
| `documentKind` | `sale` \| `backorder` | Encargo usa mismo renderer |
| `backorder` | object \| null | `%`, depósito, total encargo |
| `company` | object | `razonSocial`, `nombreFantasia`, `rut`, `businessActivity`, `logoBase64` |
| `customer` | object \| null | `name`, `document`, `phone`, `email` |
| `quotation` | object \| null | Si venta desde cotización |
| `lines[]` | | `productName`, `attributes`, `quantity`, `unitSymbol`, precios, descuento |
| `promotions[]` | | `code`, `name`, `amount` |
| `totals` | | `subtotalNet`, `taxes`, `lineDiscounts`, `orderDiscount`, `total`, `change` |
| `payments[]` | | `label`, `amount`, `detail` |

## Layout ESC/POS (orden)

1. Init + centrado
2. Empresa (fantasía o razón social, RUT, giro)
3. Folio + fecha
4. Cliente (si `customer.name` presente)
5. Líneas producto: nombre + `qty x precio` … `lineGross`
6. Totales: neto, IVA, **TOTAL** bold, vuelto si &gt; 0
7. Sección **PAGOS** si hay pagos
8. «Gracias por su compra»
9. Código de barras folio
10. `EscPosTail` (corte)

## Referencias

| Capa | Archivo |
|------|---------|
| Android | `kai-printers-android/.../PosSaleTicketEscPos.kt` |
| Tauri | `print-service/src-tauri/src/pos_sale_ticket_escpos.rs` |
| HTML POS | `pwa-pos/.../PosSaleReceiptDialog.tsx` (`buildPosSaleReceiptHtml`) |
| Encolado POS | `pos-print/lib/pos-sale-ticket-agent.ts` |
| Demo fixture | `PosSaleTicketDemo.kt` |

## Particularidades resueltas (jun 2026)

- `JsonElementExt` para `customer: null`, `rut: null`, etc.
- POS espera `print_job_done` (`waitForPrintJob`)

## Tests existentes

- `PosSaleTicketEscPosTest.kt` — init/cut, 58 mm, null fields, JSON realista

## Checklist mantenimiento

- [ ] Logo `logoBase64` en Android (Tauri ya lo imprime)
- [ ] Sección `promotions[]` en ticket ESC/POS (HTML sí; Android hoy no imprime promos)
- [ ] Bloque `backorder` cuando `documentKind === "backorder"`
