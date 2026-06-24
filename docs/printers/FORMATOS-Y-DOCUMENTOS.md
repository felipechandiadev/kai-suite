# Formatos y tipos de documento

Fuente de verdad de tipos: `packages/print-service-client/src/print-format.ts` y payloads `pos-*-ticket.ts`.

## Formatos físicos (`PrintFormat`)

| ID | Ancho / página | Chars/línea (ticket) | `purpose` |
|----|----------------|----------------------|-----------|
| `ticket_58mm` | 48 mm rollo | 32 | `tickets` |
| `ticket_80mm` | 72 mm rollo | 48 | `tickets` |
| `document_letter` | US Letter | — | `documents` |
| `document_a4` | A4 | — | `documents` |

Presets: `print-format-presets.ts`. El agente valida **coherencia** formato ↔ perfil papel del mapeo (`format_printer_mismatch` si no coincide).

## Tipos de job (`type` en protocolo `print`)

| `type` | Documento POS | Ticket ESC/POS Android | PDF documento |
|--------|---------------|------------------------|---------------|
| `pos-sale-ticket` | Venta / encargo | ✅ `PosSaleTicketEscPos` | ✅ HTML→PDF en POS |
| `pos-quotation-ticket` | Cotización | ⚠️ Misma entrada cola* | ✅ |
| `pos-payment-in-ticket` | Cobro PAYMENT_IN | ⚠️ | ✅ |
| `pos-customer-credit-note-ticket` | NC cliente | ⚠️ | ✅ |
| `pos-cash-closing-ticket` | Arqueo caja | ⚠️ | ✅ |
| `pos-cash-count-sheet-ticket` | Conteo | ⚠️ | ✅ |
| `pos-cash-session-opening-ticket` | Apertura caja | ⚠️ | ✅ |
| `pdf-base64` | Cualquier HTML documento | ❌ | ✅ `AndroidPdfPrinter` |
| `test_print` | Prueba config | ✅ demo / bytes fijos | — |

\* *Aceptado por `PrintFormats.isTicketJobType` pero renderer Android aún es `PosSaleTicketEscPos`; usar solo para venta hasta tener renderer dedicado.*

## Preferencias POS (`localStorage`)

Claves por tipo de documento (ej. venta vs cotización) vía `getPosDocumentPrintFormat(kind)`.

El operador puede cambiar formato en:

- Diálogo post-venta (`PrintFormatSelector`)
- Configuración → Impresión local

## Canal según contexto

| Contexto | Ticket 80 mm | Documento A4 |
|----------|--------------|--------------|
| Tablet Android + Kai Printers | Agente ESC/POS | Agente PDF |
| Desktop + agente Tauri | Agente o browser | Agente o browser |
| Sin agente | Browser (malo en térmica) | Browser |

## Archivos clave por documento (POS)

| Documento | Ticket agent | Documento HTML |
|-----------|--------------|----------------|
| Venta | `pos-sale-ticket-agent.ts` | `pos-sale-document-print.ts` |
| Cotización | `quotation-ticket-agent.ts` | `quotation-document-print.ts` |
| Arqueo | `cash-closing-ticket-agent.ts` | `cash-closing-document-print.ts` |
| Apertura | `cash-session-opening-ticket-agent.ts` | — |
| NC | `customer-credit-note-ticket-agent.ts` | `customer-credit-note-document-print.ts` |

Reimpresión venta: `reprint-sale-receipt.ts` + `CashMovementsPageClient.tsx`.
