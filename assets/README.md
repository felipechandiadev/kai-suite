# Assets del monorepo KaiStore

Carpeta de **fuentes estáticas versionadas** que no son código.

| Ruta | Contenido |
|------|-----------|
| [`brand/`](./brand/kai-store/README.md) | Marca KaiStore — logo e iconos (fuente SVG) |
| [`integrations/`](./integrations/mercado-pago/README.md) | Logos oficiales de terceros (Mercado Pago, etc.) |

## Reglas

- **Marca Kai** → `assets/brand/` + pipeline [`packages/kai-brand`](../packages/kai-brand/)
- **Integraciones** → `assets/integrations/<proveedor>/` → copias en `pwa-*/public/integrations/`
- **No** guardar aquí: fuentes eShop (`kai-eshop/src/assets/fonts/`), imágenes seed (`seeds/demo/assets/`), binarios de descarga (`kai-pos/public/downloads/`)

## Regenerar iconos Kai

```bash
npm run brand:icons
```

Fuente: `assets/brand/kai-store/source/` (ver README de marca).  
Manual PWA / favicons: [`docs/project/PWA-ICONOS-Y-FAVICONS.md`](../docs/project/PWA-ICONOS-Y-FAVICONS.md).
