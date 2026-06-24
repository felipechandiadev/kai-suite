# Kai Screen Android

Agente local de **pantalla cliente** para tablets dual-screen. Recibe el carrito del POS vía WebSocket y lo muestra en la segunda pantalla (`Presentation` API).

## Desarrollo

```bash
cd kai-screen-android
./gradlew :app:assembleDebug :app:testDebugUnitTest
```

APK debug: `app/build/outputs/apk/debug/app-debug.apk`

Copiar al POS para descarga:

```bash
cp app/build/outputs/apk/debug/app-debug.apk ../pwa-pos/public/downloads/kai-screen-android.apk
```

## Protocolo

Ver `packages/customer-display-client` y `docs/implementaciones-futuras/IF-10-kai-screen-pantalla-cliente.md`.
