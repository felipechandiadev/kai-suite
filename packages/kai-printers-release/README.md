# Kai Printers — publicación desktop

Scripts para copiar instaladores **Windows (ZIP)** y **macOS (DMG)** a `pwa-pos/public/downloads/`.

Requiere `print-service/` en el monorepo (carpeta local, gitignored).

```bash
# Desde la raíz del monorepo
npm run kai-printers-desktop:publish
npm run kai-printers-desktop:publish -- --build
npm run kai-printers-desktop:publish -- --windows-only
```

Android sigue en `npm run kai-printers:publish`.
