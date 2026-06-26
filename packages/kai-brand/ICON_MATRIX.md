# Kai Brand — iconos del ecosistema

Fuente maestra: `sources/` (export desde `~/Downloads/ICONS-KAI`).

```bash
cd packages/kai-brand
npm install
npm run generate
```

## Matriz de assets

| Archivo fuente | Uso |
|----------------|-----|
| `admin-manager.png` | **Favicon pestaña** (16×16, 32×32) en **todas** las PWAs + icono app Admin (dock / iOS / Windows tile) |
| `pos-desktop.png` | PWA POS en **Mac / Windows / iOS** (apple-touch, logo-app, mstile, maskable desktop) |
| `android-shared.png` | **Android nativo** Kai Printers + Kai Screen + **PWA POS** al “Añadir a pantalla” en Android |
| `stock-desktop.png` | PWA StockControl (todas las plataformas salvo favicon) |
| `eshop-desktop.png` | PWA eShop (todas las plataformas salvo favicon) |
| `printers-tauri.png` | **Kai Printers Tauri** (macOS Dock, .icns, .ico, Windows) |
| `brand-logo.png` | `public/logo.png` en cada PWA (UI / tickets) |

## Por aplicación

### PWA Admin (`pwa-admin/public/`)
- Favicon: admin-manager
- Instalable / dock: admin-manager
- Shortcut: `icons/shortcut-dashboard.png`

### PWA POS (`pwa-pos/public/`)
- Favicon: admin-manager (igual que Admin)
- Mac/Windows/iOS install: pos-desktop
- Android install (`android-chrome-*`): **android-shared**
- Shortcut: `icons/shortcut-pos.png`

### PWA Stock (`pwa-stock/public/`)
- Favicon: admin-manager
- Instalable: stock-desktop

### PWA eShop (`pwa-eshop/public/`)
- Favicon: admin-manager
- Instalable: eshop-desktop

### Kai Printers Android + Kai Screen Android
- Launcher adaptive + notificación: **android-shared** (`res/mipmap-*`, `drawable-*`)

### Kai Printers Tauri (`print-service/`)
- App bundle: **printers-tauri** → `npm run generate-icons`
- Tray macOS: conserva `KaiPrinters-mac-bar.png` si existe; si no, se deriva de printers-tauri

## Archivos generados (cada PWA)

| Archivo | Tamaño | Notas |
|---------|--------|--------|
| `favicon-16x16.png` | 16 | Admin favicon — **todas las apps** |
| `favicon-32x32.png` | 32 | Admin favicon — **todas las apps** |
| `apple-touch-icon.png` | 180 | Icono app (Safari / iOS) |
| `android-chrome-192x192.png` | 192 | PWA Android |
| `android-chrome-512x512.png` | 512 | PWA Android |
| `*-maskable.png` | 192/512 | Safe zone 80 % |
| `logo-app.png` | 1024 | Manifest `purpose: any` |
| `mstile-150x150.png` | 150 | Windows tile (`browserconfig.xml`) |

## Manifiestos (sin cambios de rutas)

Los `manifest.json` y `layout.tsx` de cada PWA ya apuntan a estos nombres; solo se regeneran los PNG.

## Actualizar desde diseño

1. Reemplazar PNG en `packages/kai-brand/sources/`
2. `npm run generate`
3. Commit assets generados + sources
