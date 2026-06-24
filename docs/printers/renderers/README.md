# Especificaciones de renderers ESC/POS

Índice de tickets vectoriales. Cada archivo describe payload, layout en papel, referencias de código y checklist de implementación Android.

## Matriz de estado

| ID | Título ticket | Android | Tauri | Especificación |
|----|---------------|---------|-------|----------------|
| `pos-sale-ticket` | Venta / encargo | ✅ Hecho | ✅ | [pos-sale-ticket.md](./pos-sale-ticket.md) |
| `pos-quotation-ticket` | Cotización | 📋 Por hacer | ✅ | [pos-quotation-ticket.md](./pos-quotation-ticket.md) |
| `pos-cash-closing-ticket` | Arqueo de caja | 📋 Por hacer | ✅ | [pos-cash-closing-ticket.md](./pos-cash-closing-ticket.md) |
| `pos-customer-credit-note-ticket` | Nota de crédito | 📋 Por hacer | ✅ | [pos-customer-credit-note-ticket.md](./pos-customer-credit-note-ticket.md) |
| `pos-cash-count-sheet-ticket` | Planilla de conteo | 📋 Por hacer | ✅ | [pos-cash-count-sheet-ticket.md](./pos-cash-count-sheet-ticket.md) |
| `pos-cash-session-opening-ticket` | Apertura de caja | 📋 Por hacer | ✅ | [pos-cash-session-opening-ticket.md](./pos-cash-session-opening-ticket.md) |
| `pos-payment-in-ticket` | Cobro cuenta cliente | 📋 Por hacer | ✅ | [pos-payment-in-ticket.md](./pos-payment-in-ticket.md) |

## Documentos transversales

- [INFRAESTRUCTURA-COMPARTIDA.md](./INFRAESTRUCTURA-COMPARTIDA.md) — dispatcher, helpers, tests, null JSON
- [../RENDERERS-ESC-POS.md](../RENDERERS-ESC-POS.md) — plan maestro y fases

## Convenciones de especificación

Cada `pos-*-ticket.md` incluye:

1. **Payload** — campos TypeScript y ejemplo JSON
2. **Layout ESC/POS** — secciones en orden
3. **Referencias** — Rust (paridad), HTML POS, agente POS
4. **Barcode / logo** — si aplica
5. **Tests** — casos mínimos
6. **Checklist** — tareas Android concretas
