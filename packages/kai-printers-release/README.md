# Kai Printers — publicación desktop

Scripts para copiar instaladores **Windows (ZIP)** y **macOS (DMG)** a `pwa-pos/public/downloads/`.

Requiere `kai-printers-desktop/` en el monorepo.

```bash
# Desde la raíz del monorepo
npm run kai-printers-desktop:publish
npm run kai-printers-desktop:publish -- --build
npm run kai-printers-desktop:publish -- --windows-only
```

Android sigue en `npm run kai-printers:publish`.
