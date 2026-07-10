# `@kai/ui`

Librería de componentes React compartidos entre **pwa-admin**, **pwa-pos**, **pwa-eshop** y **pwa-stock**.

## Uso

```ts
import { Button, Dialog, Alert, DataGrid, Tabs, Card } from "@kai/ui";
```

Cada PWA define tokens `--color-*` en su `globals.css`. Los componentes usan CSS colocalizado y variables CSS.

## Scripts

- `npm run typecheck` — verificación TypeScript
- `npm run test` — tests unitarios

Desde la raíz del monorepo:

```bash
npm run ui:typecheck
npm run ui:test
```

## Alcance

Primitivos UI genéricos, DataGrid y layouts base. Ver [ADAPTACION.md](./ADAPTACION.md) para exclusiones (TopBar, dominio ERP, kai-printers-desktop).

## Stubs

```bash
node packages/ui/scripts/create-reexport-stubs.mjs
```
