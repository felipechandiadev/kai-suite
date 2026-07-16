# Kai — Landing (Astro)

Landing comercial de **Kai / KaiStore**, inspirada en la estructura de [CIVIKA landing](https://github.com/felipechandiadev/civika) (hero con mockup, marquee, capas, ecosistema, pilares, módulos, SII opcional, bento).

Contenido comercial en [`../docs/sales/`](../docs/sales/).

## Desarrollo

Desde la raíz del monorepo:

```bash
npm run landing:dev
```

O desde esta carpeta:

```bash
npm install
npm run dev
```

Abre http://localhost:5066

## Capturas de las apps

Por defecto hay **placeholders SVG** en `public/screenshots/` (tema Kai).

```bash
npm run screenshots:placeholders
```

Para capturas reales: guardar como `public/screenshots/{app}.webp` y actualizar rutas en `src/content/site.ts` si cambias extensión.

## Build

```bash
npm run build
npm run preview
```

Output en `dist/`.

## Deploy

Vercel con **Root Directory** `landing`, o estático desde `dist/`.

## Colores de marca

Paleta Kai (desde `assets/brand` y admin):

| Token | Valor |
|-------|-------|
| Navy | `#002b59` |
| Accent | `#0a7cad` |
| Cyan | `#04c9e6` |
| Light | `#18B3D6` / `#65F3FF` |

Estilos en `src/styles/kai.css`.
