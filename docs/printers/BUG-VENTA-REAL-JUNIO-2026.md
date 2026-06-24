# Postmortem — Venta real no imprimía (junio 2026)

**Estado:** resuelto  
**Versión agente:** Kai Printers Android **v1.1.5** (versionCode 9)  
**Fecha cierre:** junio 2026  

## Síntoma

| Flujo | Resultado |
|-------|-----------|
| Ticket de prueba (configuración POS) | OK |
| Venta demo (fixture `VTA-PRUEBA-001`) | OK |
| **Venta real** (auto-impresión al pagar) | No imprimía, sin error visible |
| **Reimprimir** en movimientos de caja | Igual, silencioso |

El log del POS mostraba encolado correcto (`ticket → agente ESC/POS`), lo que indicaba fallo **después** del WebSocket, en la cola Android o USB.

## Causa raíz (principal)

El JSON de venta real enviado por el POS incluye campos **explícitamente `null`**:

```json
{
  "customer": null,
  "quotation": null,
  "company": {
    "nombreFantasia": null,
    "rut": null,
    "businessActivity": null
  },
  "payments": [{ "label": "Efectivo", "amount": 5000, "detail": null }]
}
```

El fixture de demo **no** tenía esos `null` (incluía objeto `customer` completo).

En `PosSaleTicketEscPos.kt` (Kotlin) se usaba:

```kotlin
ticket["customer"]?.jsonObject  // lanza si el valor es JsonNull
```

En `kotlinx.serialization.json`, `JsonNull` **no** es Kotlin `null`. El operador `?.` no cortocircuita: se llama `.jsonObject` sobre `JsonNull` y se lanza:

> `Element class kotlinx.serialization.json.JsonNull is not a JsonObject`

El job fallaba en la cola; el POS **no esperaba** el resultado del job y cerraba el WebSocket de inmediato → el usuario no veía el error.

## Causas contribuyentes

1. **Sin `waitForPrintJob`:** el POS daba por exitoso el encolado (`channel: "agent"`).
2. **UI silenciosa en caja:** `CashMovementsPageClient` solo avisaba si `channel === "browser"`.
3. **Auto-impresión doble:** efecto React dependía de todo el objeto `data`, no solo del folio.
4. **Tickets USB grandes:** sin pausa entre chunks podía fallar intermitentemente (mitigado con `Thread.sleep(5)`).
5. **Jobs atascados en `printing`:** bloqueaban la cola (mitigado con `recoverStalePrintingJobs`).
6. **`waitForOpen`:** reportaba `not_started` cuando la conexión fallaba rápido (mensaje engañoso).

## Solución implementada

### POS (`packages/print-service-client` + `pwa-pos`)

- `PrintServiceConnection.waitForPrintJob(jobId)` — mantiene WS hasta `print_job_done` / `print_job_failed`
- `printPosSaleTicketAgentOrBrowser` espera entrega (60 s) antes de devolver éxito
- Errores visibles en `PosSaleReceiptDialog` y reimpresión en movimientos de caja
- Auto-impresión: una vez por folio; reintento solo en errores transitorios
- Mensajes humanizados: `print_job_timeout`, `closed_before_open`, etc.

### Android (`kai-printers-android`)

- **`JsonElementExt.kt`:** `jsonObj()`, `jsonStr()`, `jsonNum()` — toleran `JsonNull`
- **`PosSaleTicketEscPos`:** refactor completo a lectura segura
- **`PrintQueueWorker`:** recuperación jobs obsoletos, `withTimeout(60_000)` en write
- **`UsbEscPosTransport`:** delay entre chunks
- **`EscPosBarcode`:** sanitiza ASCII, máx. 48 caracteres
- Tests: `buildsTicketWithExplicitNullFieldsFromPos`, `JsonElementExtTest`

## Cómo validar regresión

1. Venta **sin cliente** (customer null) → debe imprimir
2. Venta con varios ítems y pagos → debe imprimir
3. Reimprimir desde movimientos de caja → mensaje de éxito o error claro
4. Si se detiene Kai Printers → error de conexión legible, no silencio

## Lecciones

1. **Siempre probar con payload de producción**, no solo fixtures optimistas.
2. En Kotlin JSON, **nunca** usar `.jsonObject` / `.jsonPrimitive` directo en campos opcionales del POS.
3. **Encolado ≠ impreso:** el protocolo ya tiene eventos de fin de job; el cliente debe esperarlos en flujos críticos (venta).
4. Documentar la matriz documento × formato para no mezclar responsabilidades (ver [FORMATOS-Y-DOCUMENTOS.md](./FORMATOS-Y-DOCUMENTOS.md)).
