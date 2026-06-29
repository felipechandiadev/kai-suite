# KaiStore — marca e iconos

## Fuente de verdad

| Archivo | Descripción |
|---------|-------------|
| [`source/kai-favicon.svg`](./source/kai-favicon.svg) | Ola azul — favicon pestaña, PWA install, launcher, app instalada |
| [`source/kai-logo.svg`](./source/kai-logo.svg) | Logo completo (ola + KAI) — top bar, login, sidebar, tickets (`logo.png`) |
| [`source/kai-tray-white.svg`](./source/kai-tray-white.svg) | Ola blanca — tray macOS, notificaciones Android |
| [`source/kai-tray-black.svg`](./source/kai-tray-black.svg) | Ola negra — solo composición de fondo |

Editar **solo** los SVG. Los PNG en `exports/` y en cada `pwa-*/public/` se generan automáticamente.

## Regenerar

```bash
npm run brand:icons
```

Pipeline: [`packages/kai-brand`](../../../packages/kai-brand/)

1. `rasterize-svg.mjs` — SVG → `packages/kai-brand/sources/master-1024.png`
2. `generate-all.mjs` — PWA, Android nativo, Kai Printers Tauri (si `kai-printers-desktop/` existe)
3. `export-to-assets.mjs` — copia de referencia en `exports/`

## Exports (referencia, no editar a mano)

```
exports/
  pwa/       favicon, apple-touch, android-chrome, logo-app, logo-ui
  android/   play-store-512.png
  desktop/   icon.ico, icon.icns (si Tauri generó)
```

## Fondo en iconos instalables

- UI / tickets (`logo.png`): **transparente**
- PWA maskable + Android adaptive background: **blanco `#FFFFFF`**
