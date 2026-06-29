# KaiStore — marca e iconos

## Fuente de verdad

| Archivo | Descripción |
|---------|-------------|
| [`source/kai-logo.svg`](./source/kai-logo.svg) | Logo Kai (ola + KAI), fondo transparente, 1024×1024 |

Editar **solo** el SVG. Los PNG en `exports/` y en cada `pwa-*/public/` se generan automáticamente.

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
