# Kai Printers Android

App agente de impresión para tablet (misma máquina que el POS o en red).

## Versión actual (junio 2026)

| Campo | Valor |
|-------|-------|
| `VERSION_NAME` | 1.1.8 |
| `VERSION_CODE` | 13 |
| APK publicado | `pwa-pos/public/downloads/kai-printers-android-1.1.8.apk` |
| Manifest | `pwa-pos/public/downloads/kai-printers-android.manifest.json` |

Publicar nueva versión:

```bash
npm run kai-printers:publish
```

## Estructura del proyecto

```
kai-printers-android/
  app/src/main/java/com/kaistore/printers/
    service/PrintAgentForegroundService.kt
    ws/WebSocketServerManager.kt
    protocol/ProtocolDispatcher.kt
    queue/PrintQueueWorker.kt
    data/AgentRepository.kt, AgentDatabase.kt
    print/EscPosWriter.kt, TicketEscPosDispatcher.kt, Pos*TicketEscPos.kt, EscPosLogo.kt, JsonElementExt.kt
    usb/UsbEscPosTransport.kt
    ui/mapping/          — líneas de mapeo (alias, propósito, perfil)
    ui/printers/         — tabs Bluetooth / red / USB
```

## Líneas de mapeo (modelo POS + Kai Printers)

Cada impresora es una **card** en `printer_mapping_lines` con tres ejes independientes:

| Eje | Valores | Dónde se define |
|-----|---------|-----------------|
| **Uso** (`purpose`) | `tickets` / `documents` | Kai Printers al agregar la impresora |
| **Formato** (`paperProfile`) | `58mm`, `80mm`, `a4`, `letter` | Kai Printers (ancho/hoja de esa línea) |
| **Conexión** | Bluetooth, red (`net:host:port`), USB (`usb:id`) | Kai Printers |
| **Alias** (`displayLabel`) | Texto libre | Kai Printers; el POS elige por uso |

En la app Android → **Configurar impresoras**:

1. **Agregar impresora** → elegir uso, formato, conexión, dispositivo y alias.
2. Ejemplo: uso **Tickets**, formato **80 mm**, Bluetooth, alias `Caja`.
3. Ejemplo: uso **Documentos**, formato **A4**, red, alias `Oficina`.
4. En cada card: **Probar dispositivo** (prueba ESC/POS o PDF según uso).
5. En el POS → Impresión local:
   - **Impresoras**: solo dos selects — **Tickets** y **Documentos** (`aliasesByPurpose`).
   - **Impresión según documento**: por tipo (venta, cotización, …) elegir **Ticket** o **Documento** (no 58/80 mm; el ancho lo resuelve el agente desde `paperProfile` de la línea).

`get_config` expone `aliasesByPurpose` (principal para el POS) y `aliasesByFormat` (derivado, informativo).

## Flujo de un job de venta

1. `ProtocolDispatcher.handlePrint` valida `format`, `purpose`, mapeo impresora.
2. `repository.enqueueJob` persiste JSON del ticket en SQLite.
3. `queueWorker.notifyNewJob()` → `PrintQueueWorker.drain()`.
4. `TicketEscPosDispatcher.fromJob(documentType, payload)` → renderer `Pos*TicketEscPos` → `byte[]`.
5. `TransportFactory.write(ref, bytes)` según USB/BT/red.

Jobs **documento** (`purpose: documents`, `type: pdf-base64`): `AndroidPdfPrinter` con tamaño A4/Letter según `format` y perfil de la línea.

## Cambios recientes (modelo impresión)

- Cards con **uso**, **formato** y **conexión** separados; botón **Probar dispositivo**
- POS: 2 impresoras (tickets/documentos) + modo ticket/documento por tipo de documento
- El agente ajusta `ticket_58mm` / `ticket_80mm` / `document_*` desde `paperProfile` de la línea (`resolveFormatForMapping`)

## Cambios v1.1.8

- UI de **líneas de mapeo** con alias, propósito y perfil (58/80 mm o A4/Letter)
- Múltiples líneas sin borrar las existentes (`upsertMappingLine`)
- Línea `documents` con `system:print` (Android Print Framework)
- `test_print` soporta `purpose: documents`
- `PrinterRef.SystemPrint` para referencia de impresión del sistema

## Cambios v1.1.6

- `TicketEscPosDispatcher` + renderers ESC/POS para todos los `pos-*-ticket`
- `EscPosWriter` (primitivas compartidas) y logo raster (`EscPosLogo`)
- Capabilities hello completas (`pos-quotation-ticket`, arqueo, NC, etc.)
- Venta: promociones, encargo, atributos de línea

## Cambios críticos v1.1.5

- Lectura JSON con `JsonElementExt` (campos `null` del POS)
- Recuperación de jobs `printing` colgados
- Timeout y pacing USB
- Arranque del servicio dispara `recoverStalePrintingJobs` + drenado de cola

## Tests unitarios

```bash
cd kai-printers-android
./gradlew :app:testDebugUnitTest --tests "com.kaistore.printers.print.*"
```

Casos obligatorios:

- `buildsTicketWithExplicitNullFieldsFromPos` — paridad payload venta real
- `JsonElementExtTest` — `customer: null` no lanza

## Documentación relacionada

- Instalación operadores: [KAI_PRINTERS_INSTALACION_ANDROID.md](../KAI_PRINTERS_INSTALACION_ANDROID.md)
- IF implementación original: [IF-01](../implementaciones-futuras/IF-01-kai-printers-android-nativo.md)
