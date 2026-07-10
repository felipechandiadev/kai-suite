# `@kai/ui`

Librería de componentes React compartidos entre `pwa-admin` y `pwa-pos`.

## Uso

```ts
import { Button, Dialog, Alert, DataGrid } from "@kai/ui";
```

Cada PWA define tokens `--color-*` en su `globals.css`. Los componentes usan CSS colocalizado y variables CSS.

## Scripts

- `npm run typecheck` — verificación TypeScript
- `npm run test` — tests unitarios (p. ej. `resolve-touch-input-mode`)

## Alcance fase 1

Primitivos UI, DataGrid y layouts base. Ver [ADAPTACION.md](./ADAPTACION.md) para exclusiones (TopBar, dominio ERP, etc.).
