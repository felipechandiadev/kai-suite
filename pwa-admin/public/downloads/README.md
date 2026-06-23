# Descargas Kai Printers (Admin)

Archivos estáticos servidos en **`/downloads/`** por la PWA de administración.

## Subir manualmente al VPS

Mismo APK que en el POS. Opciones:

1. **Copiar aquí** (misma ruta relativa que en pwa-pos):

```text
{deploy}/pwa-admin/public/downloads/kai-printers-android.apk
```

2. **O** apuntar el admin al dominio del POS con env (un solo archivo en el servidor):

```env
NEXT_PUBLIC_KAI_PRINTERS_ANDROID_URL=https://pos.tu-dominio.cl/downloads/kai-printers-android.apk
```

## Archivos esperados

| Archivo | Plataforma |
|---------|------------|
| `kai-printers-android.apk` | Android |
| `kai-printers-windows.exe` | Windows (futuro) |
| `kai-printers-macos.dmg` | macOS (futuro) |

## Git

No commitees binarios en el repositorio.

## Guía operador

[INSTALACION_ANDROID.md](./INSTALACION_ANDROID.md) — misma guía que en el POS.
