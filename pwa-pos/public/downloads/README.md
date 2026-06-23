# Descargas Kai Printers (POS)

Archivos estáticos servidos en **`/downloads/`** por la PWA del POS.

## Subir manualmente al VPS

1. Compilá el APK release firmado.
2. Copiá el archivo a esta carpeta en el servidor con el nombre esperado:

| Archivo | Plataforma |
|---------|------------|
| `kai-printers-android.apk` | Android (tablet / teléfono POS) |
| `kai-printers-windows.exe` | Windows (futuro) |
| `kai-printers-macos.dmg` | macOS (futuro) |

**Ruta en el VPS** (deploy con Next):

```text
{deploy}/pwa-pos/public/downloads/kai-printers-android.apk
```

URL pública:

```text
https://TU-DOMINIO-POS/downloads/kai-printers-android.apk
```

## URL personalizada (opcional)

Si el APK vive en otro host o carpeta nginx, definí en `pwa-pos/.env.local`:

```env
NEXT_PUBLIC_KAI_PRINTERS_ANDROID_URL=https://pos.tu-dominio.cl/downloads/kai-printers-android.apk
```

## Git

No commitees `.apk`, `.exe` ni `.dmg`. Solo este README; los binarios van en el servidor.

## Guía operador

Instrucciones para cajeros: [docs/KAI_PRINTERS_INSTALACION_ANDROID.md](../../../docs/KAI_PRINTERS_INSTALACION_ANDROID.md)
