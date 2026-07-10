# Adaptación — `@kai/ui`

## Incluido en el paquete (fase 1)

| Carpeta | Estado |
|---------|--------|
| Alert, Badge, Button, IconButton, Switch, DotProgress | Listo |
| TextField (unificado admin + touch POS) | Listo |
| Select, AutoComplete, DropdownList, NumberStepper | Listo |
| Dialog (+ DeleteDialog) | Listo |
| DataGrid | Listo |
| layouts (BasicPageLayout, CollectionPageLayout, TabPageLayout) | Listo |

## Permanece en cada PWA

| Carpeta | Motivo |
|---------|--------|
| TopBar/, SideBar/ | Navegación y features admin |
| PurchaseDocumentBuilder/, PlannedPaymentLines/, PrintDocuments/ | Dominio ERP/compras |
| Multimedia/ | Acoplado a features multimedia |
| PosTopBar/ | Específico POS |
| BaseForm/ | Generadores de formularios por entidad |
| Dialog/ChangePasswordDialog | Usa next-auth — vive en cada PWA |
| EShop* (pwa-eshop) | Storefront |

## Consumo en apps

Las PWAs mantienen stubs en `src/shared/components/*` que re-exportan desde `@kai/ui` para compatibilidad con imports existentes (`@/shared/components/...`).

Nuevo código: preferir `import { Button } from "@kai/ui"`.

## Tailwind

- **pwa-admin** (v3): `content` incluye `../packages/ui/src/**/*`
- **pwa-pos** (v4): `@source` en `globals.css` apunta a `packages/ui/src`
