# Módulo — `@kai/ui` para Lite (Vite)

Trabajo en `packages/ui` (no copiar a Lite).

## Objetivo
Que Lite importe:

```ts
import { Button, Dialog, TextField, DataGrid, Tabs, … } from "@kai/ui";
```

sin romper Next en admin/pos web.

## Archivos a tocar / crear en `packages/ui`

| Path | Función / cambio |
|------|------------------|
| `src/navigation/RouterAdapter.tsx` (nuevo) | context `useNav()` abstracto |
| `src/navigation/next-adapter.ts` | implementa con next/navigation |
| `src/navigation/memory-adapter.ts` | implementa con react-router |
| `src/components/DataGrid/**` | reemplazar imports next → `useNav()` |
| `src/components/Tabs/Tabs.tsx` | idem |
| `src/components/layouts/CollectionPageLayout.tsx` | idem |
| `src/index.ts` | export adapters |
| `package.json` | peer `react-router` optional |

## Funciones nuevas
| Export | Rol |
|--------|-----|
| `NavProvider` | inyecta adapter |
| `useNav()` | `{ pathname, push, replace, searchParams, setSearchParams }` |
| `createMemoryNavAdapter(router)` | Lite |
| `createNextNavAdapter()` | PWAs |

## Lite `src/providers` integración
`AppProviders` envuelve `NavProvider` con memory/react-router adapter.
