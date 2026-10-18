# Kai Printers — release

Compila los agentes y deja binarios + manifests en `dist/kai-downloads/`, listos para subir a la
carpeta pública de `KAI_DOWNLOADS_URL` (la leen POS y Admin en runtime).

**Checklist paso a paso:** [PUBLISH-CHECKLIST.md](./PUBLISH-CHECKLIST.md)

## Comando único (Android + Windows + macOS)

Desde la raíz del monorepo:

```bash
npm run kai-printers:release
```

Orquestador: `scripts/stage-all.mjs`

| Flag | Efecto |
|------|--------|
| `--build` | Recompila desktop antes de copiar |
| `--android-only` | Solo APK |
| `--desktop-only` | Solo Windows + macOS |
| `--windows-only` / `--macos-only` | Solo un desktop |
| `--bump patch\|minor\|code-only` | Incrementa versión Android |

## Por plataforma

```bash
npm run kai-printers:release:android
npm run kai-printers:release:desktop
```

Desktop: `scripts/stage-desktop-downloads.mjs` (requiere `kai-printers-desktop/`).

Carpeta de salida: `KAI_DOWNLOADS_OUT_DIR` (default `dist/kai-downloads/`).

## Publicar

Subir el contenido de `dist/kai-downloads/` a `KAI_DOWNLOADS_URL`. Detalle:
[`kai-pos/public/downloads/README.md`](../../kai-pos/public/downloads/README.md).
