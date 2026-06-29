# Descargas agentes locales (POS)

Archivos estáticos servidos en **`/downloads/`** por la PWA del POS.

## Kai Printers — Android

```bash
npm run kai-printers:publish
# o: bash kai-printers-android/scripts/publish-to-pos-downloads.sh [--bump patch|minor|code-only]
```

| Archivo | En git | Descripción |
|---------|--------|-------------|
| `kai-printers-android-{version}.apk` | No | Binario instalable |
| `kai-printers-android.manifest.json` | Sí | Versión, nombre de archivo y `builtAt` |
| `INSTALACION_ANDROID.md` | Sí | Guía operador |

## Kai Printers — Windows y macOS

Requiere `kai-printers-desktop/` en el monorepo. Compila si falta el artefacto.

```bash
npm run kai-printers-desktop:publish
npm run kai-printers-desktop:publish -- --build          # fuerza recompilar
npm run kai-printers-desktop:publish -- --windows-only   # solo ZIP Windows
npm run kai-printers-desktop:publish -- --macos-only     # solo DMG macOS
```

| Archivo | En git | Descripción |
|---------|--------|-------------|
| `kai-printers-windows-{version}-x64-portable.zip` | No | ZIP portable (KaiPrinters.exe + SumatraPDF.exe) |
| `kai-printers-windows.manifest.json` | Sí | Versión y nombre del ZIP |
| `kai-printers-macos-{version}-aarch64.dmg` | No | Instalador macOS (Apple Silicon) |
| `kai-printers-macos.manifest.json` | Sí | Versión y nombre del DMG |

En el POS: **Configuración → Impresión local → Descargar Kai Printers** (Android, Windows, macOS).

## Kai Screen — publicar APK Android

```bash
npm run kai-screen:publish
```

| Archivo | En git |
|---------|--------|
| `kai-screen-android-{version}.apk` | No |
| `kai-screen-android.manifest.json` | Sí |

## Subir manualmente al VPS

Copiá los binarios versionados **y** los manifest JSON a `pwa-pos/public/downloads/` en el deploy (o sirvelos desde el mismo origen del POS).

Ejemplo:

```text
pwa-pos/public/downloads/
  kai-printers-android-1.1.8.apk          # no en git
  kai-printers-android.manifest.json      # sí en git
  kai-printers-windows-1.0.2-x64-portable.zip
  kai-printers-windows.manifest.json
  kai-printers-macos-1.0.2-aarch64.dmg
  kai-printers-macos.manifest.json
```

## URL personalizada (opcional)

```env
NEXT_PUBLIC_KAI_PRINTERS_ANDROID_URL=https://pos.tu-dominio.cl/downloads/kai-printers-android-1.1.8.apk
NEXT_PUBLIC_KAI_PRINTERS_WINDOWS_URL=https://pos.tu-dominio.cl/downloads/kai-printers-windows-1.0.2-x64-portable.zip
NEXT_PUBLIC_KAI_PRINTERS_MACOS_URL=https://pos.tu-dominio.cl/downloads/kai-printers-macos-1.0.2-aarch64.dmg
```

## Git

No commitees `.apk`, `.zip` ni `.dmg`. Sí commiteá los manifest JSON y las guías `.md`.

## Guías operador

- Kai Printers Android: [INSTALACION_ANDROID.md](./INSTALACION_ANDROID.md)
- Kai Screen Android: [INSTALACION_KAI_SCREEN_ANDROID.md](./INSTALACION_KAI_SCREEN_ANDROID.md)
