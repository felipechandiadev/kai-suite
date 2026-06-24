# Backlog de implementación — renderers ESC/POS Android

Lista ejecutable para llevar Kai Printers Android a **paridad con Tauri** en los siete tipos de ticket vectorial.

Referencias: [RENDERERS-ESC-POS.md](./RENDERERS-ESC-POS.md), [renderers/](./renderers/README.md).

---

## Estado de commits (repo)

| Qué | Commit / estado |
|-----|-----------------|
| Fix venta real + docs base `docs/printers/` | ✅ `7f647334` |
| Docs renderers (`RENDERERS-ESC-POS`, `renderers/*`) | ⏳ **sin commit** (working tree) |
| Rama local vs `origin/main` | **5 commits ahead** (sin push) |

---

## Fase 0 — Infraestructura compartida (bloqueante)

### 0.1 `EscPosCore.kt`

**Crear:** `kai-printers-android/.../print/EscPosCore.kt`

Extraer de `PosSaleTicketEscPos.kt` y portar helpers de `print-service/src-tauri/src/pos_sale_ticket_escpos.rs`:

| Función | Descripción |
|---------|-------------|
| `escPosInit()` | `ESC @`, PC850, estado base |
| `appendLine(buf, text, width)` | ISO-8859-1 + LF |
| `appendDivider(buf, width)` | Guiones ancho completo |
| `appendLabelValue(buf, label, value, width)` | Columnas |
| `money(n: Double)` | CLP entero `$` |
| `formatDateTime(iso: String)` | Fecha corta es-CL |
| `appendLogo(buf, base64?)` | **Opcional fase 4** — raster logo |
| `appendBarcode(buf, data)` | Delegar `EscPosBarcode` |

**Refactor:** `PosSaleTicketEscPos` usa `EscPosCore` (sin cambio visual; tests existentes deben pasar).

### 0.2 `TicketEscPosDispatcher.kt`

**Crear:** `kai-printers-android/.../print/TicketEscPosDispatcher.kt`

```kotlin
fun fromJob(documentType: String, ticketJson: String, widthChars: Int): ByteArray
```

`when (documentType)` → renderer correspondiente; `else` → `unsupported_document_type`.

**Modificar:** `PrintQueueWorker.kt` — reemplazar llamada directa a `PosSaleTicketEscPos`.

**Test:** `TicketEscPosDispatcherTest.kt` — cada tipo devuelve bytes no vacíos con fixture mínimo.

### 0.3 Capabilities hello

**Modificar:** `ProtocolConstants.kt` — añadir al publicar cada renderer:

```
pos-quotation-ticket
pos-payment-in-ticket
pos-customer-credit-note-ticket
pos-cash-closing-ticket
pos-cash-count-sheet-ticket
pos-cash-session-opening-ticket
```

---

## Fase 1 — Renderers P1 (tienda)

### 1.1 Cotización — `PosQuotationTicketEscPos.kt`

| Ítem | Detalle |
|------|---------|
| Spec | [renderers/pos-quotation-ticket.md](./renderers/pos-quotation-ticket.md) |
| Paridad Rust | `pos_quotation_ticket_escpos.rs` |
| HTML POS | `quotation-receipt-print.ts` |
| Test | `PosQuotationTicketEscPosTest.kt` |
| POS QA | Imprimir cotización desde POS |

Campos críticos: `documentNumber`, `validUntil`, `lines[].variantName/sku`, `notes`, `terms`, barcode.

### 1.2 Arqueo — `PosCashClosingTicketEscPos.kt`

| Ítem | Detalle |
|------|---------|
| Spec | [renderers/pos-cash-closing-ticket.md](./renderers/pos-cash-closing-ticket.md) |
| Paridad Rust | `pos_cash_closing_ticket_escpos.rs` |
| HTML POS | `cash-closing-receipt-print.ts` |
| Test | `PosCashClosingTicketEscPosTest.kt` |
| POS QA | Cerrar caja → imprimir arqueo |

Campos críticos: `counted.*`, `countedGrand`, `difference`, `usedBlindCount`.

### 1.3 Nota de crédito — `PosCustomerCreditNoteTicketEscPos.kt`

| Ítem | Detalle |
|------|---------|
| Spec | [renderers/pos-customer-credit-note-ticket.md](./renderers/pos-customer-credit-note-ticket.md) |
| Paridad Rust | `pos_customer_credit_note_ticket_escpos.rs` |
| HTML POS | `customer-credit-note-receipt-print.ts` |
| Test | `PosCustomerCreditNoteTicketEscPosTest.kt` |
| POS QA | Emitir NC → imprimir ticket |

Campos críticos: `creditNoteFolio`, `originalSaleFolio`, `refundMode`, `refundPayments[]`.

---

## Fase 2 — Caja (apertura y planilla)

### 2.1 Apertura — `PosCashSessionOpeningTicketEscPos.kt`

| Spec | [renderers/pos-cash-session-opening-ticket.md](./renderers/pos-cash-session-opening-ticket.md) |
| Rust | `pos_cash_session_opening_ticket_escpos.rs` |
| POS | `cash-session-opening-print.ts` + `cash-session-opening-ticket-agent.ts` |

### 2.2 Planilla conteo — `PosCashCountSheetTicketEscPos.kt`

| Spec | [renderers/pos-cash-count-sheet-ticket.md](./renderers/pos-cash-count-sheet-ticket.md) |
| Rust | `pos_cash_count_sheet_ticket_escpos.rs` |
| POS | `cash-count-sheet-print.ts` |

Lógica especial: líneas `Etiqueta: ________` + defaults 6 medios si `paymentLines` vacío.

---

## Fase 3 — PAYMENT_IN + entrega POS

### 3.1 Cobro cliente — `PosPaymentInTicketEscPos.kt`

| Spec | [renderers/pos-payment-in-ticket.md](./renderers/pos-payment-in-ticket.md) |
| Rust | `pos_payment_in_ticket_escpos.rs` |
| Admin | `admin-payment-in-ticket-print.ts` |

### 3.2 `waitForPrintJob` en todos los `*-ticket-agent.ts`

Hoy solo **venta** espera entrega. Replicar patrón de `pos-sale-ticket-agent.ts`:

| Archivo POS | Prioridad |
|-------------|-----------|
| `quotation-ticket-agent.ts` | P1 |
| `cash-closing-ticket-agent.ts` | P1 |
| `customer-credit-note-ticket-agent.ts` | P1 |
| `cash-count-sheet-ticket-agent.ts` | P2 |
| `cash-session-opening-ticket-agent.ts` | P2 |

Dentro de `withPrintAgentConnection`: tras encolar, `await conn.waitForPrintJob(jobId, 60_000)`.

---

## Fase 4 — Paridad y pulido venta

| Tarea | Archivo |
|-------|---------|
| Logo `logoBase64` en tickets | `EscPosCore.appendLogo` + venta |
| Promociones en ticket venta | `PosSaleTicketEscPos` |
| Bloque encargo (`backorder`) | `PosSaleTicketEscPos` |
| Bump versión Kai Printers | `version.properties` + `npm run kai-printers:publish` |

---

## Criterios de aceptación globales

- [ ] Cada renderer tiene test unitario + fixture con campos `null` explícitos
- [ ] `TicketEscPosDispatcherTest` cubre los 7 tipos
- [ ] `./gradlew :app:testDebugUnitTest` verde
- [ ] Capability en `hello` por tipo implementado
- [ ] Ticket impreso en tablet legible y alineado con HTML de referencia
- [ ] Error visible en POS si job falla (con `waitForPrintJob`)

---

## Orden sugerido de PRs

| PR | Contenido | Tamaño |
|----|-----------|--------|
| **PR-A** | Fase 0 (EscPosCore + Dispatcher + refactor venta) | Mediano |
| **PR-B** | Cotización + tests | Pequeño |
| **PR-C** | Arqueo + NC + tests | Mediano |
| **PR-D** | Apertura + planilla + tests | Pequeño |
| **PR-E** | PAYMENT_IN + waitForPrintJob agents | Mediano |
| **PR-F** | Logo + promos venta + versión APK | Pequeño |

---

## Archivos que NO hay que tocar (salvo waitForPrintJob)

- Protocolo WebSocket (`ProtocolDispatcher` encolado OK)
- Payloads TypeScript (`packages/print-service-client/src/pos-*-ticket.ts`) — ya definidos
- Tauri `print-service` — referencia solamente

## Estimación rough

| Fase | Esfuerzo |
|------|----------|
| 0 | 0,5–1 día |
| 1 (3 renderers) | 1,5–2 días |
| 2 | 0,5 día |
| 3 | 0,5–1 día |
| 4 | 0,5 día |

*Asumiendo port casi línea a línea desde Rust.*
