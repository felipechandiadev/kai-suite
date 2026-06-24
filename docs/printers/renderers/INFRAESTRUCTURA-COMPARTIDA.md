# Infraestructura compartida — renderers ESC/POS (Android)

## TicketEscPosDispatcher (por implementar)

Reemplaza la llamada directa a `PosSaleTicketEscPos` en `PrintQueueWorker`:

```kotlin
object TicketEscPosDispatcher {
    fun fromJob(documentType: String, ticketJson: String, widthChars: Int): ByteArray =
        when (documentType) {
            "pos-sale-ticket" -> PosSaleTicketEscPos.fromTicketJson(ticketJson, widthChars)
            "pos-quotation-ticket" -> PosQuotationTicketEscPos.fromTicketJson(ticketJson, widthChars)
            "pos-cash-closing-ticket" -> PosCashClosingTicketEscPos.fromTicketJson(ticketJson, widthChars)
            "pos-customer-credit-note-ticket" -> PosCustomerCreditNoteTicketEscPos.fromTicketJson(ticketJson, widthChars)
            "pos-cash-count-sheet-ticket" -> PosCashCountSheetTicketEscPos.fromTicketJson(ticketJson, widthChars)
            "pos-cash-session-opening-ticket" -> PosCashSessionOpeningTicketEscPos.fromTicketJson(ticketJson, widthChars)
            "pos-payment-in-ticket" -> PosPaymentInTicketEscPos.fromTicketJson(ticketJson, widthChars)
            else -> throw IllegalStateException("unsupported_document_type")
        }
}
```

Ventajas:

- Un solo `when` alineado con `print-service/src-tauri/src/ws.rs` → `vector_ticket_escpos_writer`
- Tests del dispatcher: cada tipo devuelve bytes no vacíos
- `PrintFormats.isTicketJobType` sigue validando en encolado; el dispatcher valida en ejecución

## JsonElementExt (implementado)

`kai-printers-android/.../print/JsonElementExt.kt`

| Función | Uso |
|---------|-----|
| `jsonObj()` / `jsonStr()` / `jsonNum()` / `jsonArr()` | En `JsonElement` |
| `JsonObject.jsonStr("key")` etc. | Acceso por clave |
| `String?.present()` | Omite blank y trata ausencia |

**Regla:** prohibido `.jsonObject` / `.jsonPrimitive` de kotlinx en campos que el POS puede mandar como `null`.

## EscPosLayout

`EscPosLayout.forWidthChars(widthChars)`:

| Formato | `widthChars` | `productNameChars` |
|---------|--------------|-------------------|
| 58 mm | 32 | ~24 |
| 80 mm | 48 | ~36 |

Viene de `PrintFormats.charsPerLine(format)` en la cola.

## Componentes ESC/POS existentes

| Clase | Rol |
|-------|-----|
| `EscPosTail` | Feed + corte parcial |
| `EscPosBarcode` | CODE128, ASCII sanitizado, máx. 48 chars |
| `EscPosStreamWriter` | Chunking para transporte |
| `UsbEscPosTransport` | Bulk OUT + pausa entre chunks |

## EscPosCore (por extraer / ampliar)

Hoy `PosSaleTicketEscPos` inlinea init, money, divider, labelValue. Para paridad Tauri conviene centralizar (equivalente a `pos_sale_ticket_escpos.rs` helpers):

| Helper | Descripción |
|--------|-------------|
| `escPosInit(buf)` | `ESC @`, charset PC850, alineación |
| `line(buf, text, width)` | Texto ISO-8859-1 truncado + LF |
| `divider(buf, width)` | Línea de guiones |
| `labelValue(buf, label, value, width)` | Columnas alineadas |
| `money(n: Double)` | `$` + entero CLP (`es_CL`) |
| `formatDateTime(iso)` | `dd/MM/yyyy HH:mm` aprox. |
| `appendLogo(buf, base64?)` | Raster ESC/POS — **pendiente** (Tauri sí) |
| `appendBarcode(buf, data)` | Delegar a `EscPosBarcode` |

Portar nombres y comportamiento desde Rust reduce drift entre agentes.

## Paridad Tauri

Para cada renderer Android nuevo:

1. Leer `build_pos_*_ticket_escpos` en Rust
2. Leer HTML POS (`*-receipt-print.ts`)
3. Implementar Kotlin con mismas secciones
4. Comparar salida en test: strings legibles en ISO-8859-1 contienen títulos clave (`COTIZACION`, `ARQUEO DE CAJA`, etc.)

No hace falta diff binario byte a byte; sí mismas **secciones y montos**.

## Tests

Estructura por tipo:

```
app/src/test/.../PosQuotationTicketEscPosTest.kt
  - buildsMinimalQuotation
  - toleratesExplicitNullFields
  - usesNarrowLayoutFor58mm (opcional)
```

Fixture `toleratesExplicitNullFields` debe reflejar JSON real del POS (`customerName: null`, etc.).

`JsonElementExtTest` ya cubre la capa JSON.

## Capabilities hello

Tras cada renderer, actualizar `ProtocolConstants.kt`:

```kotlin
val AGENT_CAPABILITIES_MVP = listOf(
    "pos-sale-ticket",
    "pos-quotation-ticket",
    // ...
)
```

El POS usa `agentSupportsPosQuotationTicket(hello)` etc. en cada `*-ticket-agent.ts`.

## waitForPrintJob en POS

Solo `pos-sale-ticket-agent.ts` espera entrega hoy. Al cerrar renderers, replicar en:

- `quotation-ticket-agent.ts`
- `cash-closing-ticket-agent.ts`
- `cash-count-sheet-ticket-agent.ts`
- `cash-session-opening-ticket-agent.ts`
- `customer-credit-note-ticket-agent.ts`

(admin PAYMENT_IN cuando se use en tablet)
