# Estrategia de impresión

## Objetivo

Imprimir desde el POS (y admin) de forma **predecible** en entornos heterogéneos:

- Distintos **tipos de documento** (venta, encargo, cotización, arqueo, NC, etc.)
- Distintos **formatos físicos** (58 mm, 80 mm, carta, A4)
- Distintas **impresoras** (térmica USB/BT/red, láser/inyección para documentos)
- Distintos **runtimes** (tablet Android con Kai Printers, desktop con Tauri, fallback navegador)

La regla de producto: **el operador no debe adivinar** si el ticket salió o no. Si falla, el POS muestra un error accionable.

## Dos propósitos de impresora

El agente mapea alias del POS a impresoras del sistema:

| `purpose` | Uso | Formatos |
|-----------|-----|----------|
| `tickets` | Rollos térmicos ESC/POS | `ticket_58mm`, `ticket_80mm` |
| `documents` | Hojas (PDF) | `document_letter`, `document_a4` |

Configuración en POS → **Impresión local** (`localStorage`): host, puertos WS/WSS, alias por propósito.

## Dos canales de salida

| Canal | Cuándo | Comportamiento |
|-------|--------|----------------|
| **agent** | Kai Printers (o Tauri) conectado y configurado | JSON vectorial → ESC/POS o PDF en cola del agente |
| **browser** | Sin agente, desktop sin Android, o fallback documento | `window.print()` sobre HTML en iframe oculto |

En **tablet Android** el fallback a navegador para tickets 80 mm **no es viable** (no hay impresora térmica en el browser). Por eso ventas en Android **exigen** agente y muestran error explícito si falla.

## Vectorial vs raster

| Tipo job | Payload | Quién renderiza |
|----------|---------|-----------------|
| Ticket POS (`pos-sale-ticket`, etc.) | JSON estructurado | Agente → `PosSaleTicketEscPos` (Android) o equivalente Tauri |
| Documento | HTML en POS → PDF base64 | Agente imprime PDF (Android: `AndroidPdfPrinter`) |
| Prueba rápida | `test_print` en agente | Bytes ESC/POS fijos o demo (`PosSaleTicketDemo`) |

Los tickets **no** viajan como PDF al agente (`tickets_no_pdf`). Si el ticket ESC/POS falla en desktop, el POS puede caer a **documento hoja** (misma venta en carta/A4).

## Preferencias por documento

Cada tipo de documento guarda su `PrintFormat` en `localStorage` (ver `getPosDocumentPrintFormat`):

- Venta / encargo
- Cotización
- Arqueo, apertura, conteo
- Nota de crédito
- etc.

El selector en el diálogo de venta permite cambiar formato antes de reimprimir.

## Pipeline de una venta (happy path)

1. Usuario completa pago → `PosSaleReceiptDialog` abre con datos del comprobante.
2. Auto-impresión (1× por folio, ~1,2 s después) llama `printPosSaleTicketAgentOrBrowser`.
3. POS abre WebSocket a Kai Printers (`withPrintAgentConnection`).
4. Espera `OPEN` + opcionalmente `hello` (capabilities).
5. Envía `print` con `type: "pos-sale-ticket"` y JSON del ticket.
6. Agente encola job → `PrintQueueWorker` → `PosSaleTicketEscPos` → `UsbEscPosTransport` (u otro transporte).
7. POS espera `print_job_done` / `print_job_failed` (`waitForPrintJob`, hasta 60 s).
8. Si falla: mensaje en diálogo de venta o en movimientos de caja (reimpresión).

## Principios para evolucionar

1. **Un protocolo** (`print-service-client`) para POS, admin y futuras apps.
2. **JSON tolerante a null** en agentes Kotlin (campos opcionales del POS).
3. **Confirmar entrega** del job, no solo encolado.
4. **Renderer por `documentType`** en Android (hoy venta está madura; otros tipos comparten entrada pero requieren ESC/POS propio).
5. **Tests con JSON realista** (cliente `null`, pagos, folio largo), no solo fixture demo.

## Roadmap inmediato

- [ ] Renderers ESC/POS dedicados en Android para cotización, arqueo, NC (hoy `isTicketJobType` acepta el tipo pero usa `PosSaleTicketEscPos`)
- [ ] Logo en ticket Android (POS ya envía `logoBase64`; Android aún no lo imprime en venta)
- [ ] Métricas / log estructurado en cola (job id, duración USB)
- [ ] Paridad Tauri ↔ Android en recuperación de jobs `printing` obsoletos
