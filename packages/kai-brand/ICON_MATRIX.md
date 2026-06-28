# Kai Brand — iconos del ecosistema

Fuente maestra: [`assets/brand/kai-store/source/kai-logo.svg`](../../assets/brand/kai-store/source/kai-logo.svg) (SVG transparente, 1024×1024).

**Un solo icono Kai** para Admin, POS, Stock, eShop, Kai Printers Android, Kai Screen Android y Kai Printers desktop.

```bash
# Desde la raíz del monorepo
npm run brand:icons

# O directamente
cd packages/kai-brand
npm install
npm run generate
```

## Pipeline

1. `rasterize-svg.mjs` — SVG → `sources/master-1024.png` (RGBA, logo al 88% del canvas)
2. `generate-all.mjs` — propaga a PWAs, Android `res/`, Tauri (si `print-service/` existe)
3. `export-to-assets.mjs` — copia inventario a `assets/brand/kai-store/exports/`

## Matriz de salidas

### PWA (cada app: admin, pos, stock, eshop)

| Archivo | Tamaño | Fondo | Uso |
|---------|--------|-------|-----|
| `favicon-16x16.png` | 16 | Transparente | Pestaña |
| `favicon-32x32.png` | 32 | Transparente | Pestaña HD |
| `apple-touch-icon.png` | 180 | Transparente | iOS home screen |
| `android-chrome-192x192.png` | 192 | Transparente | PWA Android (`any`) |
| `android-chrome-512x512.png` | 512 | Transparente | Splash / install |
| `*-maskable.png` | 192, 512 | Blanco + logo 80% | Android adaptive PWA |
| `mstile-150x150.png` | 150 | Transparente | Windows tile |
| `logo-app.png` | 1024 | Transparente | Manifest |
| `logo.png` | 1024 | Transparente | UI / tickets |

### Android nativo (Kai Printers + Kai Screen)

| Tipo | mdpi → xxxhdpi |
|------|----------------|
| Legacy launcher | 48, 72, 96, 144, 192 |
| Adaptive foreground | 108, 162, 216, 324, 432 |
| Notificación / monochrome | 24, 36, 48, 72, 96 |
| Play Store | 512 (`packages/kai-printers-brand/sources/`) |

Adaptive background: `#FFFFFF`.

### Kai Printers Tauri (`print-service/`)

- `npm run generate-icons` desde `public/kai-printers.png`
- Salida: `src-tauri/icons/` (`.ico`, `.icns`, PNG)
- Tray macOS: `KaiPrinters-mac-bar.png` (44px, transparente)

## Actualizar desde diseño

1. Reemplazar `assets/brand/kai-store/source/kai-logo.svg`
2. `npm run brand:icons`
3. Commit: SVG + `exports/` + `pwa-*/public/` + Android `res/` (+ Tauri si aplica)

## Manifiestos

Los `manifest.json` y `layout.tsx` de cada PWA ya apuntan a estos nombres; solo se regeneran los PNG.
