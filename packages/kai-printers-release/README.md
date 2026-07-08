# Kai Printers — publicación en el POS

Copia instaladores a `pwa-pos/public/downloads/` para **Configuración → Impresión local** del POS.

## Comando único (Android + Windows + macOS)

Desde la raíz del monorepo:

```bash
npm run kai-printers:publish
```

Orquestador: `scripts/publish-all.mjs`

| Flag | Efecto |
|------|--------|
| `--build` | Recompila desktop antes de copiar |
| `--android-only` | Solo APK |
| `--desktop-only` | Solo Windows + macOS |
| `--windows-only` / `--macos-only` | Solo un desktop |
| `--bump patch\|minor\|code-only` | Incrementa versión Android |

## Por plataforma

```bash
npm run kai-printers:publish:android
npm run kai-printers:publish:desktop
```

Desktop: `scripts/publish-to-pos-downloads.mjs` (requiere `kai-printers-desktop/`).

## Deploy al VPS

Ver **`pwa-pos/public/downloads/README.md`** (commit manifests → push → pull → rsync binarios).
