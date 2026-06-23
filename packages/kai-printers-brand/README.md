# Kai Printers — Brand assets

Fuente única de iconos para Kai Printers (desktop Tauri y Android).

## Fuente

- `sources/kai-printers.png` — logo maestro

## Generar iconos Android

```bash
cd packages/kai-printers-brand
npm install
npm run generate
cp -R output/android/* ../../kai-printers-android/app/src/main/res/
```

## Matriz API → asset

| Asset | Carpeta | API |
|-------|---------|-----|
| `ic_launcher.png`, `ic_launcher_round.png` | `mipmap-*` | 24–25 (launcher legacy, fondo blanco) |
| `ic_launcher_foreground.png` | `mipmap-*` | 26+ (adaptive foreground, safe zone ~66 %) |
| `ic_launcher.xml` / `ic_launcher_round.xml` | `mipmap-anydpi-v26` | 26+ (adaptive + monochrome ref) |
| `ic_launcher_monochrome.png` | `drawable-*` | 33+ (themed icon) |
| `ic_notification.png` | `drawable-*` | todas (notificación FGS) |

Salida en `output/android/` — copiar a `kai-printers-android/app/src/main/res/`.
