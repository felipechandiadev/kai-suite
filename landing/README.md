# Kai — Landing (Astro)

Landing comercial dual: **KaiStore** y **KaiFood** en el mismo paquete.

## Producto (`LANDING_PRODUCT`)

| Valor | Sitio en `/` | Puerto típico |
|-------|----------------|---------------|
| `store` (default) | KaiStore | `KAI_LANDING_PORT=5066` |
| `food` | KaiFood | `KAI_LANDING_PORT=5166` |

Los tenants (`kai-store-demo` / `kai-food-demo`) inyectan `LANDING_PRODUCT` vía registry.

## Desarrollo

Desde la raíz del monorepo:

```bash
# Store
LANDING_PRODUCT=store KAI_LANDING_PORT=5066 npm run landing:dev

# Food
LANDING_PRODUCT=food KAI_LANDING_PORT=5166 npm run landing:dev
```

O desde esta carpeta:

```bash
npm install
LANDING_PRODUCT=food KAI_LANDING_PORT=5166 npm run dev
```

## Estructura

```text
src/
  pages/index.astro     # router por LANDING_PRODUCT
  shared/               # Layout, Reveal, tokens
  store/                # contenido + UI KaiStore
  food/                 # contenido + UI KaiFood (multipantalla)
public/
  store/screenshots/
  food/screenshots/
```

## Capturas

Placeholders SVG en `public/{store,food}/screenshots/`.

```bash
npm run screenshots:placeholders
```

## Build

```bash
LANDING_PRODUCT=food npm run build
```

El producto queda baked en el build (vite `define`). Para dos deploys, construí dos veces con distinto `LANDING_PRODUCT`.

## Colores

- **Store**: navy / cyan (`store/styles/store.css`)
- **Food**: dark + ámbar cocina / verde listo (`food/styles/food.css`)
