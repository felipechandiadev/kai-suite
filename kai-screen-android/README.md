# Kai Screen Android

Agente local de **pantalla cliente** para tablets dual-screen. Recibe el carrito del POS vía WebSocket y lo muestra en la segunda pantalla (`Presentation` API).

## Desarrollo

```bash
cd kai-screen-android
./gradlew :app:assembleDebug :app:testDebugUnitTest
```

APK debug: `app/build/outputs/apk/debug/app-debug.apk`

## Release versionado

Desde la raíz del monorepo:

```bash
npm run kai-screen:release
# Opcional: npm run kai-screen:release -- --bump patch
```

Deja `kai-screen-android-{version}.apk` y `kai-screen-android.manifest.json` en `dist/kai-downloads/`.
Subir ambos a la carpeta de `KAI_DOWNLOADS_URL` ([guía](../kai-pos/public/downloads/README.md)).

## Protocolo

Ver `packages/customer-display-client` y `docs/implementaciones-futuras/IF-10-kai-screen-pantalla-cliente.md`.

## Conexión con el POS

Misma tablet, loopback `127.0.0.1`. Puertos por defecto: WS `14570`, WSS `14571`. La app guía al operador en **Conectar con el POS** (checklist de 5 pasos).
