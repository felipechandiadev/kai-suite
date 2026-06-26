# KaiStore eShop — Guía de desarrollo

Documento maestro para implementar **KaiStore eShop** (`pwa-eshop`) dentro del monorepo **flow-store-2**, alineado con **pwa-admin**, **pwa-pos** y **pwa-stock**.

**Versión:** 0.3  
**Última actualización:** 2026-05-28

---

## 1. Objetivo del producto

Tienda en línea B2C (o B2B simplificada) por empresa, alimentada por el catálogo y stock del ERP. El cliente final navega productos, arma un carrito, completa checkout y consulta información institucional (sucursales, testimonios, contacto).

| App | Rol | Carpeta | Puerto dev sugerido |
|-----|-----|---------|---------------------|
| Admin | Configuración eShop, catálogo, envíos (futuro), testimonios | `pwa-admin` (sección nueva) | 3031 |
| POS | Punto de venta físico | `pwa-pos` | 3032 |
| Stock | Inventario móvil | `pwa-stock` | 3033 |
| **eShop** | Tienda pública | **`pwa-eshop`** | **3034** |
| Backend | API REST `/api` | `backend` | 3030 |

---

## 2. Principios de arquitectura (igual que admin/POS)

### 2.1 Patrón de capas (frontend)

```
UI (RSC + Client Components)
  → Server Actions ("use server")
    → Use Cases (application/*.usecase.ts)
      → Domain (Zod / tipos)
        → Infrastructure (*.request.ts — único fetch a BACKEND_API_URL)
          → Backend NestJS /api/...
```

**Reglas:**

- **Prohibido** `fetch` al backend desde componentes cliente (salvo multimedia upload u otros casos ya documentados en admin).
- Páginas de listado/detalle: **RSC** + `export const dynamic = "force-dynamic"` cuando haya mutaciones.
- Reutilizar componentes compartidos de `pwa-admin/src/shared/components` vía bridge (como POS):

```ts
import { Button, Dialog, DotProgress } from "@/shared/admin-shared";
```

Referencias: `pwa-admin/AGENTS.md`, `pwa-pos/AGENTS.md`, `WEBADMIN_INSTRUCTIONS.md`, `.instructions/webadmin.instruction`.

### 2.2 Patrón backend

- Módulo Nest por dominio: `domain/`, `application/`, `infrastructure/`, `presentation/`.
- Multi-tenant: `companyId` en entidades y `@CurrentCompany()` / contexto tenant en endpoints internos.
- API pública eShop: rutas dedicadas bajo prefijo propuesto `/api/e-shop/...` con autenticación **por empresa** (slug o dominio) y sin sesión de usuario ERP para el comprador final (ver §6).

### 2.3 Misma stack de librerías (baseline)

Alinear `package.json` de `pwa-eshop` con **pwa-pos** (mínimo viable):

| Dependencia | Uso en eShop |
|-------------|----------------|
| Next.js 16 + React 19 | App Router |
| next-auth | Solo si se requiere login de comprador (fase 2+); MVP puede ser guest checkout |
| @tanstack/react-query | Catálogo, carrito cliente, invalidación |
| zod | Validación domain |
| lucide-react | Iconografía (carrito, redes) |
| leaflet + react-leaflet | Mapa “Dónde estamos” |
| tailwindcss | Estilos (v3 como admin o v4 como POS — elegir uno y documentar) |
| socket.io-client | Opcional: stock en vivo en PDP (fase 2) |

**No obligatorio en MVP eShop:** impresión (`@flowstore/document-print`), jsbarcode, recharts.

---

## 3. Estructura de carpetas `pwa-eshop`

Propuesta espejo de `pwa-pos` (App Router bajo `src/app` o `app/` — seguir convención del repo; hoy admin usa `app/` en raíz del proyecto y POS usa `src/app/`; **recomendación: usar `src/app/` como POS** para features aisladas).

```
pwa-eshop/
├── package.json                 # kai-pwa-eshop, dev -p 3034
├── .env.example
├── .env.local
├── public/
│   ├── manifest.json
│   └── icons/...
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Theme, providers, metadata empresa
│   │   ├── page.tsx             # Home (Hero + destacados + testimonios + mapa teaser)
│   │   ├── productos/
│   │   │   ├── page.tsx         # Listado / grid / filtros
│   │   │   └── [slugOrId]/
│   │   │       └── page.tsx     # PDP (product detail page)
│   │   ├── checkout/
│   │   │   └── page.tsx
│   │   ├── nosotros/
│   │   │   └── page.tsx
│   │   ├── donde-estamos/
│   │   │   └── page.tsx         # Mapa full + listado sucursales
│   │   └── api/auth/[...nextauth]/   # Solo si aplica
│   ├── features/
│   │   ├── e-shop-catalog/      # listado, búsqueda, categorías
│   │   ├── e-shop-cart/         # carrito cliente (localStorage + sync opcional)
│   │   ├── e-shop-checkout/     # flujo checkout
│   │   ├── e-shop-storefront/   # home, layout (hero hardcodeado en UI)
│   │   ├── e-shop-testimonials/ # lectura testimonios públicos
│   │   ├── e-shop-branches/     # mapa / sucursales
│   │   └── company/               # branding, logo, redes (desde API pública)
│   ├── shared/
│   │   ├── admin-shared/        # reexport componentes admin (como POS)
│   │   └── components/
│   │       ├── EShopTopBar/
│   │       ├── EShopCartDrawer/   # drawer derecha (patrón SideBar admin)
│   │       ├── EShopFooter/
│   │       └── EShopHero/
│   └── lib/
│       └── auth/                # si aplica
└── AGENTS.md                    # reglas específicas eShop
```

Cada feature sigue: `actions/`, `application/`, `domain/`, `infrastructure/`, `types/`.

---

## 4. Electron y actualizaciones automáticas

Hoy las apps del monorepo son **PWA Next.js**; no hay paquete `electron/` en el repo. La guía asume **paridad futura** con admin/POS/stock si se empaquetan con Electron.

### 4.1 Consideraciones transversales

| Tema | Qué definir |
|------|-------------|
| **Canal de release** | Misma versión semántica por app (`NEXT_PUBLIC_APP_VERSION`) + build id |
| **Auto-update** | `electron-updater` (o equivalente) apuntando a feed HTTPS (S3/GitHub Releases); **cada app** (`admin`, `pos`, `stock`, `e-shop`) con artefacto y manifest propios |
| **Backend** | Endpoint de **versión mínima soportada** por app (`GET /api/app-versions`) para forzar actualización en clientes obsoletos |
| **CORS** | Añadir `http://localhost:3034` y origen producción eShop en `CORS_ORIGIN` del backend |
| **Deep links** | esquema `kaistore-eshop://` para abrir checkout o producto desde Electron |

### 4.2 eShop en Electron (opcional)

- Ventana principal carga la URL del build estático o `localhost:3034` en dev.
- El carrito drawer y mapa deben probarse en ventana reducida (min 360px ancho).
- Actualizaciones: no bloquear checkout en curso; aplicar update al reiniciar.

### 4.3 Checklist backend para releases

- [ ] Migraciones DB compatibles con N y N-1 cliente.
- [ ] Feature flag plano `companies.settings.eShopEnabled` para apagar tienda sin redeploy.
- [ ] Changelog en endpoint o header `X-API-Version`.

---

## 5. Configuración de empresa (`companies.settings`)

### 5.1 Principio: sin objeto anidado `eShop`

Los ajustes nuevos se agregan como **claves de primer nivel** dentro de `companies.settings` (columna JSON), con el mismo criterio que `checks`, `paymentMethods` o `quotations`: **un bloque de configuración por dominio, no un mega-objeto `eShop`**.

**No crear** `settings.eShop: { ... }`. Motivos:

- **Redes y contacto público** sirven también en admin, POS, comunicaciones futuras → viven en claves de empresa genéricas.
- **Hero de la tienda** no se persiste en BD ni en la entidad empresa en esta fase → ver §5.3.
- Los flags y parámetros propios de la tienda usan prefijo `eShop*` en la raíz de `settings` (campos planos).

Validación en backend: tipos dedicados en `backend/src/modules/companies/domain/` (p. ej. `company-public-contact.types.ts`) + métodos en `CompaniesService`, igual que `company-checks.types.ts`.

### 5.2 Claves propuestas en `companies.settings`

```ts
/**
 * Extensión de companies.settings — claves de primer nivel.
 * Persistencia: columna JSON `companies.settings`, sin objeto `eShop`.
 */

/** Contacto y redes — reutilizable en eShop, footer admin y otras apps. */
type CompanyPublicContactSettings = {
  email?: string;
  instagram?: string;
  tiktok?: string;
};

/** Fragmento relevante de settings (referencia). */
type CompanySettings = {
  // …existentes: paymentMethods, checks, quotations, …

  publicContact?: CompanyPublicContactSettings;
  /** Slogan / leyenda / definición breve — footer eShop y material institucional. */
  companyTagline?: string;

  /** Master switch tienda online. Si false, API eShop en mantenimiento. */
  eShopEnabled?: boolean;
  /** Slug público para resolver tienda (header `X-Store-Slug` o path). */
  eShopPublicSlug?: string;
  /** IDs de variantes destacadas en home (#productos). */
  eShopFeaturedProductVariantIds?: string[];
  /** Umbral CLP para barra “envío gratis” en carrito (§7.0.3). */
  eShopFreeShippingThreshold?: number;
  /** Fase 2 envío propio: 'disabled' | 'flat' | 'distance'. */
  eShopShippingMode?: 'disabled' | 'flat' | 'distance';
};
```

| Clave | Ámbito | Admin UI |
|-------|--------|----------|
| `publicContact` | Empresa (global) | **Empresa** → contacto público / redes |
| `companyTagline` | Empresa (global) | **Empresa** → texto leyenda |
| `eShopEnabled` | Tienda online | **Empresa** → pestaña/sección **eShop** (solo toggle y parámetros tienda) |
| `eShopPublicSlug` | Tienda online | Idem |
| `eShopFeaturedProductVariantIds` | Tienda online | **eShop** → productos destacados |
| `eShopFreeShippingThreshold` | Tienda online | **eShop** → envío / promoción |
| `eShopShippingMode` | Tienda online | **eShop** → envíos (placeholder fase 2) |

### 5.3 Hero — hardcodeado (sin BD)

Por decisión de producto **MVP**:

- El bloque **Hero** (`#hero`) se implementa en `pwa-eshop` con contenido **fijo en código** (componente `EShopHero` + constantes o copy en `src/features/e-shop-storefront/constants/hero.ts`).
- **No** enlazar hero a `companies`, **no** `multimedia_links` con `entityType` hero, **no** campos en `settings`, **no** payload en `GET /api/e-shop/storefront` para título/imagen/CTA del hero.
- Fase futura (fuera de MVP): evaluar CMS o settings solo si se valida necesidad; hasta entonces, cambios de hero = deploy frontend.

### 5.4 Admin — Empresa vs sección eShop

**Empresa** (`/settings/company` o equivalente):

- Logo y datos ya existentes.
- **Nuevo:** `publicContact` (email, Instagram, TikTok).
- **Nuevo:** `companyTagline`.
- **Nuevo:** interruptor **`eShopEnabled`** (habilita/deshabilita toda la tienda de forma global).

**Menú eShop** (`mainMenu.ts`) — operación de tienda, no duplicar redes:

```
eShop (ítems visibles si eShopEnabled; configuración mínima siempre accesible para admins)
├── Productos destacados      /e-shop/featured      → eShopFeaturedProductVariantIds
├── Testimonios               /e-shop/testimonials
└── Envíos (propuesta)        /e-shop/shipping      → eShopFreeShippingThreshold, eShopShippingMode
```

Sidebar: `requiresEShopEnabled` lee `settings.eShopEnabled === true` (clave plana), análogo a `requiresChecksEnabled` + `settings.checks.enabled`.

---

## 6. Backend — módulos y APIs

### 6.1 Módulo `e-shop` (nuevo)

Responsabilidad: **API orientada al comprador**, lectura de catálogo publicado, carrito/checkout, configuración de storefront.

**Endpoints propuestos (MVP):**

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/e-shop/storefront` | Branding (logo), `publicContact`, `companyTagline`, flags planos (`eShopEnabled`, slug, umbral envío). **Sin hero.** |
| GET | `/api/e-shop/products` | Listado paginado (variantes vendibles, precio lista eShop) |
| GET | `/api/e-shop/products/:id` | PDP |
| GET | `/api/e-shop/categories` | Árbol categorías con multimedia |
| GET | `/api/e-shop/brands` | Marcas con multimedia |
| GET | `/api/e-shop/testimonials` | Activos, ordenados |
| GET | `/api/e-shop/branches` | Sucursales con `location` para mapa |
| POST | `/api/e-shop/checkout/draft` | Crear borrador pedido / cotización web |
| POST | `/api/e-shop/checkout/confirm` | Confirmar (integración venta — fase 2) |

**Identificación de tienda:**

- Header `X-Store-Slug: {slug}` o subdominio resuelto en middleware.
- Resolver `companyId` y rechazar si `settings.eShopEnabled !== true` → `503` o página mantenimiento.

**Seguridad:**

- Rate limiting en rutas públicas.
- No exponer costos internos ni stock exacto si política comercial lo restringe (solo “disponible / agotado”).

### 6.2 Entidad `EShopTestimonial`

Tabla sugerida: `e_shop_testimonials`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| companyId | uuid | índice |
| clientName | varchar(120) | nombre mostrado |
| rating | smallint | 1–5 estrellas |
| message | text | testimonio |
| isActive | boolean | default true |
| sortOrder | int | orden en home |
| createdAt / updatedAt | timestamp | |

**Admin CRUD:** patrón **Colección admin** (`/e-shop/testimonials`).

**API pública:** solo `isActive = true`, orden por `sortOrder`, límite configurable.

### 6.3 Multimedia — extensiones

El módulo `multimedia` ya soporta `entityType` + `entityId` genéricos (`multimedia_links`).

| Entidad | entityType propuesto | Estado actual | Acción |
|---------|---------------------|---------------|--------|
| Categoría | `category` | Parcial (adapter categorías) | Exponer en admin + API eShop |
| Marca | `brand` | **Sin integración UI** | Añadir upload en `UpdateBrandDialog`, listar en API |
| Empleado | `employee` | **Sin integración** | Opcional: foto perfil RRHH / “nuestro equipo” |
| Variante producto | `product_variant` | Existente | Reutilizar en PDP |

**Hero:** no usa multimedia ni settings en MVP (§5.3).

**Mejoras de flujo backend (tareas):**

1. Normalizar catálogo de `entityType` permitidos en documentación OpenAPI interna.
2. Endpoint batch `GET /api/multimedia/by-entities?entityType=brand&ids=...` (ya existe patrón `listByEntityIds`) — usar en grids eShop.
3. Tamaños recomendados (thumbnail, hero, PDP) en `metadata` del link (`usageType`: `thumbnail`, `hero`, `gallery`).

### 6.4 Módulo de envío propio (propuesta — fase 2)

**Objetivo:** Empresa con flota propia; configuración en admin, cálculo en checkout, sin integración detallada en MVP.

**Entidades borrador:**

```
shipping_zones          (por companyId, polígonos o radios desde sucursal)
shipping_rate_rules     (base + por km + recargos)
shipping_fuel_config    (precio combustible referencia, consumo km/l — opcional)
```

**Cálculo propuesto (iteración futura):**

1. Dirección cliente → geocodificar (lat/lng).
2. Sucursal origen más cercana o fija (`branchId` en settings).
3. Distancia Haversine o API rutas (Google/OSRM) — **propuesta**, no implementar en MVP.
4. Tarifa = `baseFee + (distanceKm * pricePerKm) + fuelSurcharge`.
5. Devolver `{ amount, currency: 'CLP', breakdown, estimatedDays }`.

**Admin (placeholder):**

- Página `/e-shop/shipping` con copy: “Módulo en diseño — parámetros próximamente”.
- Guardar solo `settings.eShopShippingMode: 'disabled' | 'flat' | 'distance'` en MVP (`flat` = monto fijo manual).

**Checkout MVP:** envío “A acordar” o monto fijo desde settings.

---

## 7. UI eShop — diseño de pantallas

### 7.0 Directrices de diseño UX (parámetros obligatorios)

Para cualquier comercio electrónico que adopte esta estructura, las siguientes directrices son **requisitos de producto**, no recomendaciones opcionales. Deben reflejarse en componentes, API y configuración de empresa.

#### 7.0.1 Evitar la dispersión de enlaces

| Principio | Implementación |
|-----------|----------------|
| Menú mínimo | El menú superior no debe multiplicar destinos externos ni páginas intermedias innecesarias. |
| Anclas en home | En la **página de inicio**, los ítems del nav actúan como **anclas** (`#productos`, `#donde-estamos`, `#nosotros`, `#testimonios`) que hacen scroll suave a secciones de la misma URL. |
| Rutas profundas | El catálogo completo (`/productos`), PDP y checkout siguen existiendo para SEO y usuarios que lleguen por enlace directo, pero el **flujo principal de descubrimiento** prioriza la home de una sola página. |
| Footer | Enlaces institucionales pueden repetir las mismas anclas en home o apuntar a rutas dedicadas solo cuando el contenido no quepa en la landing. |

**Top Bar (home):** `Productos` → `#productos` · `Dónde estamos` → `#donde-estamos` · `Nosotros` → `#nosotros` (no navegación full-page salvo logo/checkout/carrito).

#### 7.0.2 Diseñar para la inmediatez móvil

| Principio | Implementación |
|-----------|----------------|
| Compra en grid | Cada card del grid (home destacados y listado) incluye **“Comprar ahora”** / **“+ Agregar”** visible sin abrir PDP. |
| Menos clics | Objetivo: **añadir al carrito en 1 toque** desde el grid; cantidad por defecto `1` con stepper opcional en card expandida o long-press. |
| Mobile-first | Botones con área táctil ≥ 44px; grid 2 columnas en móvil; sticky bar inferior opcional con total del carrito. |
| PDP secundaria | La PDP (`/productos/[id]`) queda para quien necesite detalle, SEO y **deconstrucción visual** (ver §7.0.4); no es obligatoria para completar una compra impulsiva. |

**Componente sugerido:** `EShopProductCard` con props `onQuickAdd`, `showQuickBuy`.

#### 7.0.3 Carrito dinámico asíncrono (drawer derecho)

| Principio | Implementación |
|-----------|----------------|
| Drawer asíncrono | Al agregar ítems, el carrito se actualiza **sin recargar** la página (estado cliente + opcional sync API). Apertura del drawer con animación desde la derecha (mismo patrón que `SideBar` admin). |
| Meta envío gratis | Barra de progreso visual: `subtotal / eShopFreeShippingThreshold` con copy del tipo *“Te faltan $X para envío gratis”* o *“¡Envío gratis desbloqueado!”*. Umbral desde `settings.eShopFreeShippingThreshold`. |
| Cálculo en vivo | Recalcular umbral en cada `add` / `remove` / `updateQuantity` (debounce 150 ms si hay muchas líneas). |
| Venta cruzada | Bloque **“Completa tu pedido”** bajo la barra: 2–4 productos complementarios de **menor valor** que reduzcan la brecha al umbral (reglas: misma categoría, accesorios, o lista curada en admin — fase 1: heurística por precio ascendente bajo el faltante). |
| API | `GET /api/e-shop/cart/suggestions?subtotal=&gap=` (fase 1 opcional; MVP puede resolver sugerencias en cliente con catálogo ya cargado). |

**Componentes:** `EShopCartDrawer`, `EShopFreeShippingProgress`, `EShopCartCrossSell`.

#### 7.0.4 Humanizar la propuesta de valor

| Principio | Implementación |
|-----------|----------------|
| Deconstrucción visual | En PDP (y opcionalmente en modal rápido desde grid): sección que **descompone** el producto — ingredientes, dimensiones, modos de uso, “qué incluye la caja”, infografías — usando multimedia del módulo existente (`usageType`: `detail`, `lifestyle`, `diagram`). |
| Testimonios situacionales | Entidad `e_shop_testimonials` debe privilegiar mensajes que describan **situaciones reales de consumo** (no slogans genéricos). En admin, placeholder del campo mensaje: *“Cuéntanos cómo usaste el producto en tu día a día…”*. |
| Home | Bloque testimonios con foto opcional del cliente (multimedia link `testimonial_avatar`) y estrellas; ubicado después de productos para reforzar confianza antes del mapa/contacto. |
| Mitigar escepticismo | Combinar: prueba social (testimonios) + transparencia (desglose producto) + política de envío visible junto a la barra de envío gratis. |

---

### 7.1 Layout global

```
┌──────────────────────────────────────────────────────────────┐
│ TOP BAR                                                       │
│ [Logo]   Productos | Dónde estamos | Nosotros     [🛒 cart]  │
│          (anclas # en home · rutas en otras páginas)          │
├──────────────────────────────────────────────────────────────┤
│  HOME: Hero → #productos → #testimonios → #donde-estamos …   │
│  OTRAS: {children}                                            │
├──────────────────────────────────────────────────────────────┤
│ FOOTER (3 columnas)                                           │
└──────────────────────────────────────────────────────────────┘

     ┌─────────────────────────┐
     │ CART DRAWER (derecha)   │  ← slide-in asíncrono
     │ ▓▓▓▓▓░░░ envío gratis   │
     │ Sugerencias cross-sell  │
     │ líneas · checkout CTA   │
     └─────────────────────────┘
```

### 7.2 Top Bar

- **Izquierda:** logo empresa (`multimedia` primary o `settings` logo URL); en home, click → scroll a `#hero` o top.
- **Centro / nav:**
  - En **`/` (home):** solo **anclas** a secciones (`#productos`, `#donde-estamos`, `#nosotros`, `#testimonios`).
  - En **otras rutas:** mismos labels pueden llevar a `/#seccion` o a rutas dedicadas si el contenido es extenso.
- **Derecha:** `IconButton` carrito (badge con cantidad) → abre **EShopCartDrawer**.
- **Drawer:** patrón `SideBar` admin (`sidebar.css`), anclado a la **derecha**; ver §7.0.3 y §8.

### 7.3 Home (`/`) — landing de una página

Secciones en orden (cada una con `id` para anclas del nav):

1. **`#hero`** — título, subtítulo, CTA, imagen: **hardcodeado en `EShopHero`** (§5.3); sin lectura de API ni empresa.
2. **`#productos`** — grid destacados con **compra instantánea** (§7.0.2); enlace secundario “Ver catálogo completo” → `/productos`.
3. **`#testimonios`** — cards situacionales (§7.0.4): nombre, estrellas 1–5, mensaje, foto opcional.
4. **`#donde-estamos`** — mapa Leaflet con pins de sucursales (teaser); CTA opcional a `/donde-estamos` si se requiere detalle.
5. **`#nosotros`** — bloque breve de propuesta de valor + enlace a `/nosotros` si hay contenido largo.
6. **Footer** — ver §7.8.

### 7.4 Página productos (`/productos`)

- Filtros: categoría, marca, búsqueda texto, orden (precio, nombre).
- Grid responsive; paginación URL (`page`, `limit`).
- Cada card: **quick add** obligatorio (§7.0.2); tap en imagen/título → PDP para detalle y deconstrucción visual.

### 7.5 PDP (`/productos/[id]`)

- Galería multimedia variante.
- Precio, SKU, selector cantidad, “Agregar al carrito” / “Comprar ahora”.
- Stock: “Disponible” / “Agotado”.
- **Deconstrucción visual** (§7.0.4): bloques `detail` / `lifestyle` / `diagram` desde multimedia.
- Testimonios filtrados por producto o categoría (fase 2); en MVP, testimonios globales en home.
- SEO: metadata dinámica por producto.

### 7.6 Páginas institucionales

| Ruta | Contenido |
|------|-----------|
| `/nosotros` | Texto empresa + opcional equipo (empleados con foto) |
| `/donde-estamos` | Mapa full + lista direcciones / horarios sucursales |

### 7.7 Checkout (`/checkout`)

**MVP:**

- Datos contacto: nombre, email, teléfono, dirección.
- Resumen carrito (solo lectura).
- Método entrega: retiro en tienda / envío (flat o “a coordinar”).
- Método pago: transferencia / pago pendiente (sin pasarela en fase 1).
- POST a `checkout/draft` → pantalla confirmación con número de referencia.

**Fase 2:** integración Webpay, cuotas, cuenta cliente.

### 7.8 Footer (3 columnas)

| Col 1 | Col 2 | Col 3 |
|-------|-------|-------|
| Logo + leyenda (`settings.companyTagline`) | Enlaces: Nosotros, Dónde encontrarnos | Contacto: `settings.publicContact` (email, Instagram, TikTok) |
| | | Copyright © {year} {companyName} |

---

## 8. Carrito cliente (`e-shop-cart`)

- Persistencia: `localStorage` keyed por `companySlug` (patrón `pwa-pos` `cart-storage.ts`).
- Estructura línea: `productVariantId`, `quantity`, `unitPrice` snapshot, `name`, `imageUrl`.
- **Actualización asíncrona:** mutaciones vía React context o Zustand; al `addItem`, abrir drawer y animar badge (§7.0.3).
- **Envío gratis:** derivar `gap = max(0, freeShippingThreshold - subtotal)`; exponer en drawer `EShopFreeShippingProgress`.
- **Cross-sell:** hook `useCartCrossSellSuggestions(gap)` — productos activos con precio ≤ `gap` o top N por categoría de ítems en carrito.
- Sincronización servidor opcional para usuarios logueados (fase 2).
- Validación de precio/stock al entrar a checkout (re-fetch batch).

---

## 9. Integración con catálogo ERP

- Solo variantes **activas** y con precio en lista asignada a eShop (`price_list` dedicada o flag `visibleInEShop` en variante — **definir en backend**).
- Impuestos: mostrar precio con IVA según país empresa (reutilizar lógica ventas).
- Promociones eShop: fase 2 (evaluar `promotions` module).

---

## 10. Variables de entorno `pwa-eshop`

```env
# .env.local ejemplo
BACKEND_API_URL=http://localhost:5030
NEXT_PUBLIC_APP_NAME=KaiStore eShop
NEXT_PUBLIC_APP_VERSION=0.1.0
NEXT_PUBLIC_DEFAULT_STORE_SLUG=demo
# Opcional auth comprador
NEXTAUTH_URL=http://localhost:3034
NEXTAUTH_SECRET=...
```

Backend `CORS_ORIGIN` debe incluir `http://localhost:3034`.

---

## 11. Plan de implementación por fases

### Fase 0 — Scaffold (1 sprint)

- [ ] Crear `pwa-eshop` (package.json, tailwind, bridge admin-shared).
- [ ] `AGENTS.md` eShop.
- [ ] Layout: TopBar, CartDrawer, Footer, Home shell.
- [ ] Backend: claves planas en `settings` (`eShopEnabled`, `publicContact`, …) + validación en `CompaniesService`.
- [ ] Admin: redes y tagline en **Empresa**; toggle `eShopEnabled` en **Empresa → eShop**; menú eShop operativo.
- [ ] `EShopHero` con copy/assets hardcodeados en `pwa-eshop`.

### Fase 1 — MVP storefront (2–3 sprints)

- [ ] API `storefront`, `products`, `branches`, `testimonials`.
- [ ] CRUD testimonios admin (copy orientado a situaciones reales).
- [ ] Home **single-page** con nav por anclas (§7.0.1).
- [ ] Grid con **quick buy** móvil (§7.0.2).
- [ ] Drawer carrito con barra envío gratis + cross-sell básico (§7.0.3).
- [ ] PDP con bloque deconstrucción visual (§7.0.4).
- [ ] `/productos`, carrito, checkout draft.
- [ ] Multimedia marcas en admin + API.
- [ ] Categorías con imagen en listado eShop.

### Fase 2 — Operación (backlog)

- [ ] Checkout → transacción `SALE` / `QUOTATION` automática.
- [ ] Módulo envío (diseño detallado + prototipo cálculo distancia).
- [ ] Pasarela de pago.
- [ ] Electron + auto-update eShop.
- [ ] Fotos empleados / página equipo.
- [ ] WebSocket stock en PDP.

### Fase 3 — Growth

- [ ] Cuenta cliente, historial pedidos, wishlist.
- [ ] SEO, sitemap, Open Graph por producto.
- [ ] Multi-idioma.

---

## 12. Criterios de aceptación (MVP)

1. Con `eShopEnabled = false`, la API pública responde mantenimiento y admin muestra aviso.
2. Home muestra hero **hardcodeado**, ≥1 producto destacado (`eShopFeaturedProductVariantIds`), ≥0 testimonios, mapa con ≥1 sucursal con coordenadas.
3. Nav en home usa **anclas** a secciones sin dispersar enlaces innecesarios (§7.0.1).
4. Desde el grid se puede **agregar al carrito sin abrir PDP** (§7.0.2).
5. Carrito persiste al recargar; drawer abre desde la derecha; muestra **progreso hacia envío gratis** y al menos una sugerencia cross-sell cuando `gap > 0` (§7.0.3).
6. PDP incluye sección de **deconstrucción visual** cuando hay multimedia `detail`/`diagram` (§7.0.4).
7. Checkout crea borrador en backend y muestra confirmación.
8. Footer muestra `publicContact` y `companyTagline` desde settings de empresa (no desde objeto `eShop`).
9. Admin puede crear/editar/desactivar testimonios sin deploy.

---

## 13. Referencias en el repositorio

| Tema | Ubicación |
|------|-----------|
| Patrón colección admin | `pwa-admin/app/(app)/settings/branches/` |
| Carrito POS | `pwa-pos/src/features/pos-cart/` |
| Multimedia | `backend/src/modules/multimedia/`, `pwa-admin/src/features/multimedia/` |
| Categorías + multimedia | `backend/src/modules/categories/application/category.service.adapter.ts` |
| Sucursales + mapa | `backend/src/modules/branches/` (`location.lat/lng`) |
| Company settings | `backend/src/modules/companies/application/companies.service.ts` |
| SideBar animación | `pwa-admin/src/shared/components/TopBar/sidebar.css` |
| Puertos y CORS | `backend/.env.example`, `pwa-admin/package.json` |

---

## 14. Decisiones abiertas (registrar al cerrar)

| # | Pregunta | Opciones |
|---|----------|----------|
| D1 | ¿Checkout genera `SALE` o `QUOTATION`? | Cotización web vs venta confirmada |
| D2 | ¿Lista de precios eShop dedicada? | Nueva price list vs flag en variante |
| D3 | ¿Auth comprador en MVP? | Guest only vs cuenta |
| D4 | ¿Subdominio por tienda vs slug en path? | `tienda.empresa.com` vs `/s/slug` |
| D5 | Tailwind v3 (admin) vs v4 (POS) en eShop | Unificar en monorepo |

---

## 15. Comandos iniciales (cuando se cree el proyecto)

```bash
# Desde raíz monorepo (propuesta)
cp -R pwa-pos pwa-eshop   # o scaffold manual
cd pwa-eshop
# Ajustar package.json name, port 3034, eliminar features POS no usadas
npm install
npm run dev
```

Registrar en README raíz y en `backend/.env.example` el puerto **3034**.

---

*Este documento es la guía viva del proyecto eShop. Actualizar al cerrar cada fase y al resolver decisiones de la §14.*
