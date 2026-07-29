# Kai Brand — iconos del ecosistema

**Manual completo (PWA `any`/`maskable`, favicons, iOS, checklist):** [`docs/project/PWA-ICONOS-Y-FAVICONS.md`](../../docs/project/PWA-ICONOS-Y-FAVICONS.md).

Fuentes SVG en [`assets/brand/kai-store/source/`](../../assets/brand/kai-store/source/):

| Archivo | Uso |
|---------|-----|
| `kai-favicon.svg` | Favicon, PWA, launcher Android, app Tauri (Dock / instalada) |
| `kai-tray-white.svg` | Tray macOS, notificaciones Android (silueta blanca) |
| `kai-tray-black.svg` | Solo composición de fondo; no se usa como icono solo |
| `kai-logo.svg` | Logo legacy (referencia); no entra al pipeline automático |

```bash
# Desde la raíz del monorepo
npm run brand:icons

# O directamente
cd packages/kai-brand
npm install
npm run generate
```

## Pipeline

1. `rasterize-svg.mjs` — SVG → `sources/favicon-1024.png`, `tray-white-1024.png`, `master-1024.png`
2. `generate-all.mjs` — propaga a PWAs, Android `res/`, Tauri (si `kai-printers-desktop/` existe)
3. `export-to-assets.mjs` — copia inventario a `assets/brand/kai-store/exports/`

## Matriz de fuentes → salidas

| Asset SVG | Favicon PWA | Tray Mac | Tray Win/Linux | Notif. Android | App instalada |
|-----------|-------------|----------|----------------|----------------|---------------|
| kai-favicon | Sí (pestaña) | No | Sí | No | Sí |
| kai-logo | No | No | No | No | No (`logo.png` UI) |
| kai-tray-white | No | Sí | No | Sí | No |
| kai-tray-black | No | No | No | No | No |

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
| `logo.png` | 1024 | Transparente | UI: top bar, login, sidebar, tickets (`kai-logo.svg`) |

### Android nativo (Kai Printers + Kai Screen)

| Tipo | Fuente | mdpi → xxxhdpi |
|------|--------|----------------|
| Legacy launcher | favicon | 48, 72, 96, 144, 192 |
| Adaptive foreground | favicon | 108, 162, 216, 324, 432 |
| Notificación | tray-white (silueta) | 24, 36, 48, 72, 96 |
| Play Store | favicon | 512 (`packages/kai-printers-brand/sources/`) |

Adaptive background: `#FFFFFF`.

### Kai Printers Tauri (`kai-printers-desktop/`)

- Windows/Linux app: `kai-printers.png` (favicon) → `.ico`, PNGs bundle
- **macOS Dock**: `kai-printers-mac-dock.png` (logo completo) → `icon.icns`
- Tray macOS: `tray-icon-mac.png` (44px, blanco transparente)
- Tray Windows/Linux: `tray-icon.png` (44px, favicon a color)
- Favicons dev: `public/favicon-32x32.png`, `public/apple-touch-icon.png`

## Actualizar desde diseño

1. Reemplazar SVGs en `assets/brand/kai-store/source/`
2. `npm run brand:icons`
3. Commit: SVG + `exports/` + `pwa-*/public/` + Android `res/` + Tauri icons

## Manifiestos

Los `manifest.json` y `layout.tsx` de cada PWA ya apuntan a estos nombres; solo se regeneran los PNG.
