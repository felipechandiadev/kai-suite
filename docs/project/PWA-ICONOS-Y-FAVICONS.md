# PWA: iconos de instalación y favicons

Manual técnico para que las PWAs Kai se instalen y se vean profesionales en todos los sistemas operativos. El navegador y el SO eligen el asset según el contexto (pantalla de inicio, barra de tareas, splash, pestaña, etc.): **no basta un solo icono**.

**Audiencia:** frontend, agentes IA, diseño de marca.  
**Pipeline Kai:** `npm run brand:icons` · matriz: [`packages/kai-brand/ICON_MATRIX.md`](../../packages/kai-brand/ICON_MATRIX.md) · fuente SVG: [`assets/brand/kai-store/`](../../assets/brand/kai-store/README.md).

---

## Parte A — Iconos PWA (instalación / SO)

Los iconos del **Web App Manifest** son para el sistema operativo (instalación, launcher, splash). No confundir con el favicon de la pestaña (Parte B).

### 1. Estándar moderno: `maskable` y `any`

| `purpose` | Qué es | Diseño |
|-----------|--------|--------|
| **`maskable`** | El SO puede recortar (círculo / squircle en Android). | Logo centrado + **zona segura** (~10 % de margen) alrededor. |
| **`any`** | Icono cuadrado tradicional, sin recorte obligatorio. | Puede llenar más el lienzo; fondo transparente o sólido según plataforma. |

En Kai se generan **archivos separados** para cada propósito (no un solo PNG con `purpose: "any maskable"`).

### 2. Dimensiones recomendadas

El navegador puede escalar, pero conviene servir tamaños reales para evitar pixelación.

| Tamaño | Uso principal |
|--------|----------------|
| 48×48 | Barras de herramientas / favicon básico |
| 72×72 | Android baja densidad |
| 96×96 | Android media densidad |
| 144×144 | Home en tablets Android |
| **192×192** | Android alta resolución (recomendado Google) |
| **512×512** | **Crítico** — splash e instalación; stores si se empaqueta la PWA |

**Mínimo obligatorio en Kai (manifest):** 192 y 512 en `any` **y** 192 y 512 en `maskable`.

Intermedios 48–144: el pipeline nativo Android los genera; en PWA web no son obligatorios si existen 192/512 correctos.

### 3. Configuración en el manifest

El navegador elige el mejor icono según dispositivo. Ejemplo de forma (rutas Kai reales más abajo):

```json
"icons": [
  {
    "src": "/android-chrome-192x192.png",
    "sizes": "192x192",
    "type": "image/png",
    "purpose": "any"
  },
  {
    "src": "/android-chrome-512x512.png",
    "sizes": "512x512",
    "type": "image/png",
    "purpose": "any"
  },
  {
    "src": "/android-chrome-192x192-maskable.png",
    "sizes": "192x192",
    "type": "image/png",
    "purpose": "maskable"
  },
  {
    "src": "/android-chrome-512x512-maskable.png",
    "sizes": "512x512",
    "type": "image/png",
    "purpose": "maskable"
  }
]
```

Definir también `background_color` y `theme_color` en el manifest: rellenan huecos al recortar (Android) y pintan chrome del SO. Deben alinearse con el fondo del logo / marca de la app.

**No** meter favicons 16×16 / 32×32 como únicos iconos de instalación: sirven a la pestaña, no sustituyen 192/512.

### 4. Consideraciones por plataforma

#### A. Windows y macOS (Chrome / Edge)

- Usan principalmente 192 o 512 (`any`).
- Windows: menú Inicio y barra de tareas.
- Tip: un fondo sólido ayuda en fondos claros/oscuros del escritorio; en Kai los `any` van con transparencia y los **maskable** con fondo blanco `#FFFFFF`.

#### B. Android

- **`maskable` obligatorio** para un look profesional.
- Dejar margen de seguridad ~10 % (en Kai el pipeline usa logo al **80 %** del lienzo sobre blanco).
- El SO recorta; lo importante de la marca debe quedar dentro del círculo seguro.

#### C. iOS (caso especial)

iOS **no** usa del todo el `manifest.json` para el icono de home. Hace falta en el `<head>` (o metadata Next):

```html
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
```

| Asset | Tamaño | Notas |
|-------|--------|--------|
| Apple Touch Icon | **180×180** | Obligatorio para “Añadir a pantalla de inicio”. |
| Splash iOS (`apple-touch-startup-image`) | Una imagen por resolución de iPhone | Opcional pero ideal; generar con PWA Asset Generator u similar. **Hoy Kai no declara splash por dispositivo.** |

En Next.js App Router: `metadata.icons.apple` y `metadata.appleWebApp` en el `layout.tsx` raíz (ver apps de referencia).

### 5. Guía de diseño

1. **Zona segura:** en un 512×512, imagina un círculo inscrito; la marca vive dentro. El exterior es color de fondo (maskable).
2. **Formato:** PNG. Maskable Kai: fondo sólido blanco. UI/`logo.png`: puede ser transparente.
3. **`background_color` del manifest:** coherente con el fondo del icono instalable.
4. **Generación:** no dibujar 10+ archivos a mano. En Kai:

```bash
# Desde la raíz del monorepo — fuente SVG → todos los PNG PWA
npm run brand:icons
```

Herramientas externas de apoyo: [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator), [RealFaviconGenerator](https://realfavicongenerator.net/), Favicon.io. En este monorepo la fuente de verdad es `assets/brand/kai-store/source/` + `@kai/kai-brand`.

---

## Parte B — Favicon (pestaña del navegador)

El **favicon** es distinto del icono PWA: sirve a pestaña, historial y marcadores. No uses un 512×512 como único favicon (redimensionar en cada pestaña es innecesario y peor para rendimiento).

### 1. Archivos en `public/`

| Archivo | Tamaño | Uso |
|---------|--------|-----|
| `favicon.ico` | 32×32 o 48×48 | Compatibilidad navegadores antiguos |
| `favicon-16x16.png` | 16×16 | Pestaña / marcadores |
| `favicon-32x32.png` | 32×32 | Pantallas densas (Retina / 4K) |
| `apple-touch-icon.png` | 180×180 | iOS “Añadir a inicio” (también listado en Parte A) |

### 2. Declaración en HTML / Next metadata

Orden típico (Next `metadata.icons` genera enlaces equivalentes):

```html
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="shortcut icon" href="/favicon.ico" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
```

Ejemplo Kai (App Router):

```ts
icons: {
  icon: [
    { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
  ],
  apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
},
```

### 3. Favicon SVG (recomendado en navegadores modernos)

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
```

Ventajas: escalado nítido; puede adaptarse a claro/oscuro con CSS dentro del SVG (`@media (prefers-color-scheme: dark)`).  
**Estado Kai:** la fuente es SVG en `assets/brand/…`, pero las PWAs sirven PNG generados; un `favicon.svg` en `public/` es mejora opcional aún no estandarizada en todas las apps.

### 4. PWA vs favicon

| | Favicon | Icono PWA |
|--|---------|-----------|
| Uso | Pestaña, historial | Home, menú apps, splash |
| Declaración | HTML / `metadata.icons` | `manifest.json` / `app/manifest.ts` |
| Formato | `.ico`, `.png`, `.svg` | `.png` (maskable obligatorio en Android) |
| Estrategia | Tamaños chicos (16/32) | Tamaños grandes (192/512) |

---

## Convención de nombres Kai

Cada PWA con set completo debe tener en `public/` (generado por `brand:icons`):

| Archivo | Rol |
|---------|-----|
| `favicon-16x16.png` / `favicon-32x32.png` | Favicon |
| `favicon.ico` | Legacy (recomendado; admin lo tiene) |
| `apple-touch-icon.png` | iOS 180 |
| `android-chrome-192x192.png` / `512x512.png` | PWA `purpose: "any"` |
| `android-chrome-192x192-maskable.png` / `512x512-maskable.png` | PWA `purpose: "maskable"` |
| `logo-app.png` | 1024 — referencia / manifest opcional |
| `logo.png` | UI (barra, login), **no** sustituye el set de instalación |

Manifest: declarar **any** y **maskable** por separado. Layout: `icons` + `apple` + `manifest`.

Referencia de implementación buena: `pwa-admin/app/manifest.ts`, `pwa-admin/app/layout.tsx`, `pwa-pos/public/manifest.json`.

---

## Estado por app (auditoría)

| App | Set any+maskable 192/512 | Favicon 16/32 | apple-touch 180 | Notas |
|-----|--------------------------|---------------|-----------------|-------|
| `pwa-admin` | Sí | Sí | Sí | Referencia; tiene `favicon.ico` |
| `pwa-pos` | Sí | Sí | Sí | Falta `favicon.ico` opcional |
| `pwa-stock` | Sí | Sí | Sí | OK |
| `pwa-eshop` | Sí | Sí | Sí | OK |
| `kai-delivery` | Sí | Sí | Sí | OK |
| `kai-board` | **No** | **No** | **No** | Solo `logo.png` mal tipado como 192 |
| `kai-kds` | **No** | **No** | **No** | Solo `logo.png` |
| `kai-waiter` | **No** | **No** | **No** | Solo `logo.png` |

**Gaps globales:** sin `apple-touch-startup-image` por resolución iOS; sin `favicon.svg` en `public/` de las PWAs.

Al añadir o madurar una PWA (Board, KDS, Waiter, etc.): incluirla en el target de `@kai/kai-brand`, regenerar con `npm run brand:icons`, y actualizar `manifest` + `layout` al patrón admin/POS.

---

## Checklist rápido (nueva PWA o revisión)

- [ ] PNG 192 + 512 `any` y 192 + 512 `maskable` en `public/`
- [ ] Manifest declara los cuatro (o más) con `purpose` correcto y `sizes` reales
- [ ] `background_color` / `theme_color` coherentes con la marca
- [ ] Favicon 16 + 32 (+ `favicon.ico` si es posible)
- [ ] `apple-touch-icon` 180 + metadata/`<link>` en layout
- [ ] **No** usar un único `logo.png` 1024 como único icono del manifest
- [ ] Regenerar desde SVG con `npm run brand:icons`, no editar PNG a mano

---

## Documentación relacionada

| Documento | Contenido |
|-----------|-----------|
| [`docs/apps/NAMING-SUITE.md`](../apps/NAMING-SUITE.md) | Tabla maestra de nombres (PWA + nativos) |
| [`docs/apps/MANIFESTOS-PWA.md`](../apps/MANIFESTOS-PWA.md) | Estado y estándar de manifiestos web (`short_name`, `id`, theme) |
| [`docs/apps/MANIFESTOS-NATIVOS.md`](../apps/MANIFESTOS-NATIVOS.md) | Identidad Android / Tauri |
| [`packages/kai-brand/ICON_MATRIX.md`](../../packages/kai-brand/ICON_MATRIX.md) | Matriz SVG → salidas PWA / Android / Tauri |
| [`assets/brand/kai-store/README.md`](../../assets/brand/kai-store/README.md) | Fuente de verdad de marca |
| [`assets/README.md`](../../assets/README.md) | Assets del monorepo |
| [`ARQUITECTURA_Y_ECOSISTEMA.md`](./ARQUITECTURA_Y_ECOSISTEMA.md) | Mapa de apps y puertos |
