# Kai Printers Android

Agente local de impresión para KaiStore POS en tablets Android. Expone WebSocket v2.1 en `127.0.0.1` y envía tickets ESC/POS por **Bluetooth**, **red (TCP :9100)** o **USB OTG**.

**No se conecta a la API de KaiStore** (`api.joyarte.kaisuite.pro`). El POS en Chrome usa la API para ventas y `wss://127.0.0.1:14568` para imprimir.

## Requisitos

- Android 7.0+ (API **24**), targetSdk **33** (paridad con mobilePOS)
- Impresora térmica ESC/POS: Bluetooth emparejada, red LAN (`host:9100`) o USB OTG
- POS PWA en HTTPS en el mismo dispositivo

## Puertos por defecto

| Protocolo | Puerto |
|-----------|--------|
| WS | 14567 |
| WSS | 14568 |

## Build

### Desarrollo (debug)

```bash
cd kai-printers-android
./gradlew :app:assembleDebug
./gradlew :app:testDebugUnitTest
```

APK: `app/build/outputs/apk/debug/app-debug.apk`

### Producción (release firmado, para subir al VPS)

Una sola vez, generar keystore de la organización (no se commitea):

```bash
cd kai-printers-android
chmod +x scripts/*.sh
./scripts/generate-release-keystore.sh
# Respalda release/ y keystore.properties en lugar seguro.
```

Compilar y publicar APK versionado hacia el POS:

```bash
./scripts/publish-to-pos-downloads.sh
# Opcional: ./scripts/publish-to-pos-downloads.sh --bump patch
```

Salida: `../pwa-pos/public/downloads/kai-printers-android-{version}.apk` (fuera de git) y `kai-printers-android.manifest.json` (sí en git).

`build-release-apk.sh` delega en el script anterior.

Plantilla de config: `keystore.properties.example` → `keystore.properties`.

Guía para operadores de tienda: [docs/KAI_PRINTERS_INSTALACION_ANDROID.md](../docs/KAI_PRINTERS_INSTALACION_ANDROID.md)

## Iconos

```bash
cd packages/kai-printers-brand
npm install && npm run generate
cp -R output/android/* ../kai-printers-android/app/src/main/res/
```

## Primer uso (Joyarte / producción)

1. Instalar APK y abrir **Kai Printers**.
2. Pantalla **Permisos**: notificaciones, Bluetooth, batería, iniciar servicio.
3. **Impresoras** (pestañas Bluetooth | Red | USB): configurar impresora de tickets, imprimir prueba.
4. **Servicio**: tocar «Confiar certificado WSS» y aceptar en Chrome.
5. En el POS (HTTPS): Impresión local → host `127.0.0.1`, WSS activo, puerto `14568`, alias de impresora.

## E2E

1. Venta en POS → imprimir ticket.
2. Verificar indicador de impresión en topbar del POS (verde).
3. Ticket sale en impresora sin diálogo del sistema.

## Checklist de pruebas por API

| API | Android | Verificar |
|-----|---------|-----------|
| **24** | 7.0 | Icono launcher legacy, splash, permisos BT+ubicación, FGS (`startService`), ticket ESC/POS |
| **28** | 9 | Servicio en background ≥10 min |
| **31** | 12 | `BLUETOOTH_SCAN` / `BLUETOOTH_CONNECT` |
| **33** | 13 | `POST_NOTIFICATIONS`, WSS desde Chrome HTTPS, venta POS E2E |

| Escenario | Verificar |
|-----------|-----------|
| BT legacy MAC | Ticket venta POS sin diálogo |
| BT prefijo `bt:` | Mapping + health online |
| Red IP:9100 | Probe + ticket prueba + venta POS |
| USB conectado | Permiso + ticket prueba |
| Sin impresora | `print_job_failed` + health offline |
| Publish script | Un solo APK versionado, manifest actualizado, POS descarga URL correcta |

Criterio E2E: ticket de venta sin diálogo del sistema en al menos API **24** y **33**.

## Arquitectura

- `PrintAgentForegroundService` — servicio en primer plano
- `WebSocketServerManager` — Ktor WS/WSS
- `ProtocolDispatcher` — protocolo 2.1 (`hello`, `print`, …)
- `PrintQueueWorker` — cola → `PosSaleTicketEscPos` → `TransportFactory` (BT / red / USB)

### Referencia de impresora (`systemPrinterName`)

| Transporte | Formato |
|------------|---------|
| Bluetooth | `AA:BB:…` (legacy) o `bt:{MAC}` |
| Red | `net:{host}:{port}` (default puerto 9100) |
| USB | `usb:{deviceId}` |

Fixtures de contrato: `packages/print-service-client/fixtures/`.

## Retrocompatibilidad

- **minSdk 24** con core library desugaring (`java.time` en `AgentRepository`)
- Permisos BT por era: legacy (≤30) vs SCAN/CONNECT (31+)
- FGS sin `foregroundServiceType` (targetSdk 33; `connectedDevice` requiere API 34)
- Iconos: legacy launcher (24–25), adaptive + monochrome (26+ / 33+)
- Splash: `splash_legacy.xml` + AndroidX SplashScreen (`installSplashScreen`)
