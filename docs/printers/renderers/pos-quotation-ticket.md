# Renderer: `pos-quotation-ticket`

**Estado Android:** 📋 por implementar → `PosQuotationTicketEscPos.kt`  
**Versión payload:** `POS_QUOTATION_TICKET_PAYLOAD_VERSION = 1`

## Payload

Fuente: `packages/print-service-client/src/pos-quotation-ticket.ts`

| Campo | Tipo | Notas |
|-------|------|-------|
| `version` | number | `1` |
| `documentNumber` | string | Folio cotización; **barcode** |
| `issuedAt` | string | ISO fecha emisión |
| `validUntil` | string | Vigencia |
| `company` | `PosSaleTicketCompany` | |
| `customerName` | string \| null | Plano (no objeto anidado) |
| `customerDocument` | string \| null | |
| `branchName` | string \| null | |
| `pointOfSaleName` | string \| null | |
| `lines[]` | | `productName`, `variantName`, `productSku`, `quantity`, `unitPrice`, `total` |
| `subtotal` | number | |
| `taxAmount` | number | |
| `discountAmount` | number | Mostrar si &gt; 0 |
| `total` | number | Bold |
| `notes` | string \| null | Sección envuelta |
| `terms` | string \| null | Sección envuelta |

## Layout ESC/POS (orden — paridad Tauri)

Referencia: `print-service/src-tauri/src/pos_quotation_ticket_escpos.rs`  
HTML: `pwa-pos/src/features/quotations/lib/quotation-receipt-print.ts`

1. Logo (cuando se implemente logo compartido)
2. Encabezado empresa (doble altura, centrado)
3. Razón social secundaria si difiere de fantasía
4. RUT / giro si existen
5. Divider
6. Título **COTIZACION** (bold)
7. `documentNumber`, `issuedAt`, `validUntil`
8. Cliente: nombre + documento
9. Origen: sucursal · POS
10. Líneas: nombre compuesto (producto · variante (SKU)), `qty x unit` … `total`
11. Totales: subtotal, impuestos, descuentos (negativo), **TOTAL**
12. Sección **Notas** (wrap) si `notes`
13. Sección **Condiciones** si `terms`
14. Barcode `documentNumber`
15. Corte

### Nombre de línea (lógica)

```
productName + (variantName) + (SKU)
```

Igual que `line_display_name` en Rust.

## Encolado

| App | Archivo |
|-----|---------|
| POS | `quotations/lib/quotation-ticket-agent.ts` |
| Admin | `admin-quotation-ticket-print.ts` |

Capability: `agentSupportsPosQuotationTicket(hello)`

## Ejemplo JSON mínimo (test)

```json
{
  "version": 1,
  "documentNumber": "COT-2026-001",
  "issuedAt": "2026-06-24T10:00:00.000Z",
  "validUntil": "2026-07-24T10:00:00.000Z",
  "company": {
    "razonSocial": "Comercial Demo SpA",
    "nombreFantasia": null,
    "rut": null,
    "businessActivity": null
  },
  "customerName": null,
  "customerDocument": null,
  "branchName": "Sucursal Centro",
  "pointOfSaleName": "Caja 1",
  "lines": [{
    "productName": "Anillo oro",
    "variantName": "Talla 12",
    "productSku": "AR-001",
    "quantity": 1,
    "unitPrice": 150000,
    "total": 150000
  }],
  "subtotal": 126050,
  "taxAmount": 23950,
  "discountAmount": 0,
  "total": 150000,
  "notes": null,
  "terms": null
}
```

## Checklist implementación

- [ ] Crear `PosQuotationTicketEscPos.kt`
- [ ] Registrar en `TicketEscPosDispatcher`
- [ ] Test `PosQuotationTicketEscPosTest.kt` (+ null fields)
- [ ] Añadir `pos-quotation-ticket` a `AGENT_CAPABILITIES_MVP`
- [ ] `waitForPrintJob` en `quotation-ticket-agent.ts`
- [ ] QA: imprimir cotización desde POS en tablet

## Riesgo si se usa renderer de venta

Busca `folio` inexistente → folio vacío; ignora `validUntil`, `terms`, SKU; totales con claves distintas (`subtotal` vs `subtotalNet`).
