# Descargas agentes locales (POS)

Archivos estáticos servidos en **`/downloads/`** por la PWA del POS.

## Kai Printers — publicar APK Android

Desde la raíz del monorepo:

```bash
npm run kai-printers:publish
# o: bash kai-printers-android/scripts/publish-to-pos-downloads.sh [--bump patch|minor|code-only]
```

| Archivo | En git | Descripción |
|---------|--------|-------------|
| `kai-printers-android-{version}.apk` | No | Binario instalable |
| `kai-printers-android.manifest.json` | Sí | Versión, nombre de archivo y `builtAt` |
| `INSTALACION_ANDROID.md` | Sí | Guía operador |

## Kai Screen — publicar APK Android

```bash
npm run kai-screen:publish
# o: bash kai-screen-android/scripts/publish-to-pos-downloads.sh [--bump patch|minor|code-only]
```

| Archivo | En git | Descripción |
|---------|--------|-------------|
| `kai-screen-android-{version}.apk` | No | Binario instalable |
| `kai-screen-android.manifest.json` | Sí | Versión, nombre de archivo y `builtAt` |
| `INSTALACION_KAI_SCREEN_ANDROID.md` | Sí | Guía operador |

## Subir manualmente al VPS

Copiá el APK versionado y el manifest correspondiente a esta carpeta en el deploy.

## URL personalizada (opcional)

```env
NEXT_PUBLIC_KAI_PRINTERS_ANDROID_URL=https://pos.tu-dominio.cl/downloads/kai-printers-android-1.1.4.apk
NEXT_PUBLIC_KAI_SCREEN_ANDROID_URL=https://pos.tu-dominio.cl/downloads/kai-screen-android-1.0.0.apk
```

## Git

No commitees `.apk`. Sí commiteá los manifest JSON y las guías `.md`.

## Guías operador

- Kai Printers: [INSTALACION_ANDROID.md](./INSTALACION_ANDROID.md)
- Kai Screen: [INSTALACION_KAI_SCREEN_ANDROID.md](./INSTALACION_KAI_SCREEN_ANDROID.md)
