# Kai Printers Android

App agente de impresión para tablet (misma máquina que el POS o en red).

## Versión actual (junio 2026)

| Campo | Valor |
|-------|-------|
| `VERSION_NAME` | 1.1.6 |
| `VERSION_CODE` | 11 |
| APK publicado | `pwa-pos/public/downloads/kai-printers-android-1.1.6.apk` |
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
```

## Flujo de un job de venta

1. `ProtocolDispatcher.handlePrint` valida `format`, `purpose`, mapeo impresora.
2. `repository.enqueueJob` persiste JSON del ticket en SQLite.
3. `queueWorker.notifyNewJob()` → `PrintQueueWorker.drain()`.
4. `TicketEscPosDispatcher.fromJob(documentType, payload)` → renderer `Pos*TicketEscPos` → `byte[]`.
5. `TransportFactory.write(ref, bytes)` según USB/BT/red.

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
