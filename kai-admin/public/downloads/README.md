# Descargas Kai Printers (Admin)

Archivos estáticos servidos en **`/downloads/`** por la PWA de administración.

## Fuente de verdad

El APK versionado y el manifest se publican desde el POS:

```text
kai-pos/public/downloads/kai-printers-android-{version}.apk
kai-pos/public/downloads/kai-printers-android.manifest.json
```

Podés copiar ambos aquí o apuntar el admin al dominio del POS.

## URL personalizada (recomendado)

```env
NEXT_PUBLIC_KAI_PRINTERS_ANDROID_URL=https://pos.tu-dominio.cl/downloads/kai-printers-android-1.1.0.apk
```

## Git

No commitees binarios. El manifest vive en `kai-pos/public/downloads/`.

## Guía operador

[INSTALACION_ANDROID.md](./INSTALACION_ANDROID.md) — misma guía que en el POS.
