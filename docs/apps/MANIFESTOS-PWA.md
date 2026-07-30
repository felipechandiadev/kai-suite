# Manifiestos PWA — estado actual y estándar Kai

Evaluación de Web App Manifests de las PWAs del monorepo, con foco en **`short_name`** (texto del launcher / dock) y homologación de campos.

**Última revisión:** julio 2026  
**Audiencia:** producto, frontends, agentes IA.  
**Suite completa (web + nativo):** [`NAMING-SUITE.md`](./NAMING-SUITE.md) · **Nativos:** [`MANIFESTOS-NATIVOS.md`](./MANIFESTOS-NATIVOS.md) · **SW:** [`SERVICE-WORKERS.md`](./SERVICE-WORKERS.md) · **Iconos:** [`PWA-ICONOS-Y-FAVICONS.md`](../project/PWA-ICONOS-Y-FAVICONS.md)

---

## 1. Objetivo

Que cada PWA instalable:

1. Se distinga claramente en el launcher (sin colisiones de `short_name`).
2. Declare un **`id` estable** para updates de instalación.
3. Use un **único archivo de verdad** por app (sin manifests duplicados/stale).
4. Cumpla el set mínimo de iconos Kai (any + maskable 192/512).
5. Mantenga `start_url` / `display` / `orientation` según el **rol** (no forzar igualdad donde el uso es distinto).

La tabla maestra de nombres (incluye agentes nativos) está en [`NAMING-SUITE.md`](./NAMING-SUITE.md). Este doc detalla solo el canal **Web App Manifest**.

---

## 2. Apps en alcance (PWA)

| Paquete | Producto | Rol | Puerto demo (ref.) |
|---------|----------|-----|--------------------|
| `kai-admin` | KaiStore / KaiFood / KaiServices | ERP / backoffice | 5071 |
| `kai-pos` | KaiStore / KaiFood / … | Caja / punto de venta | 5062 |
| `kai-stock` | KaiStore | Inventario piso | 5063 |
| `kai-eshop` | KaiStore | Tienda pública | 5064 |
| `kai-delivery` | KaiStore | Repartidores | 5065 |
| `kai-waiter` | KaiFood | Mesero / salón | — |
| `kai-kds` | KaiFood | Cocina (KDS) | — |
| `kai-board` | KaiFood | Monitor de pedidos | — |

**Otros instalables del ecosistema** (no Web Manifest): `kai-printers-android`, `kai-printers-desktop`, `kai-screen-android` → [`MANIFESTOS-NATIVOS.md`](./MANIFESTOS-NATIVOS.md).  
**Landing** comercial: no es app instalable de suite.  
**Release JSON** de descarga de agentes → [`RELEASE-MANIFESTS.md`](./RELEASE-MANIFESTS.md).

---

## 3. Reglas de naming (estándar propuesto)

### 3.1 Roles de cada campo

| Campo | Uso | Regla Kai |
|-------|-----|-----------|
| **`name`** | Lista de apps, prompts de instalación, “Acerca de” | Marca de producto + rol legible. Puede ser largo. |
| **`short_name`** | Icono en home / dock / task switcher | **Único en la suite**, ≤ **12 caracteres** (recomendación Chrome/Android; se trunca si no). |
| **`id`** | Identidad estable de la instalación | `kai-<slug>` (kebab), **nunca** reutilizar entre apps. No cambiar una vez en producción sin plan de migración. |
| **`description`** | Stores / A2HS | Una línea en español (es-CL). |

### 3.2 Esquema de `short_name`

**Prefijo de producto + rol corto**, sin espacios dobles ni marketing.

| Prefijo | Producto |
|---------|----------|
| `KS` | KaiStore |
| `KF` | KaiFood |
| `KV` | KaiServices *(cuando aplique una PWA dedicada)* |

**Por qué no solo “KaiStore” / “Mesero”:**

- Admin y eShop hoy comparten `short_name: "KaiStore"` → colisión en el launcher.
- Solo el rol (“Mesero”) no identifica la suite frente a otras apps del dispositivo.
- Prefijos `KS` / `KF` caben en 12 caracteres y dejan claro el vertical.

### 3.3 Tabla objetivo (todas las apps)

| App | `id` | `name` | `short_name` | Len | Notas |
|-----|------|--------|--------------|-----|-------|
| `kai-admin` | `kai-admin` | KaiStore Administración | `KS Admin` | 8 | Si el build es KaiFood/KaiServices, ver §3.4 |
| `kai-pos` | `kai-pos` | KaiStore POS | `KS POS` | 6 | |
| `kai-stock` | `kai-stock` | KaiStore Stock | `KS Stock` | 8 | Hoy “StockControl” → acortar |
| `kai-eshop` | `kai-eshop` | KaiStore eShop | `KS Shop` | 7 | Evitar colisión con Admin |
| `kai-delivery` | `kai-delivery` | KaiStore Delivery | `KS Delivery` | 11 | |
| `kai-waiter` | `kai-waiter` | KaiFood Mesero | `KF Mesero` | 9 | |
| `kai-kds` | `kai-kds` | KaiFood KDS | `KF KDS` | 6 | |
| `kai-board` | `kai-board` | KaiFood Board | `KF Board` | 8 | Hoy “Kai Board” sin vertical |

### 3.4 Builds multi-producto (admin / POS)

Algunas apps se despliegan con `NEXT_PUBLIC_KAI_PRODUCT` (`kaistore` | `kaifood` | `kaiservices`). El **`id` no debe depender del producto** (misma app = misma instalación). Sí pueden variar `name` / `short_name` / `theme_color` en runtime vía `app/manifest.ts`:

| Producto | Prefijo `short_name` | Ejemplo Admin |
|----------|----------------------|---------------|
| `kaistore` | `KS` | `KS Admin` |
| `kaifood` | `KF` | `KF Admin` |
| `kaiservices` | `KV` | `KV Admin` |

Si el manifiesto es estático (`public/manifest.json`), el valor por defecto del repo es el del producto principal de esa app (tabla §3.3).

---

## 4. Estado actual (auditoría julio 2026)

### 4.1 Campos de identidad

| App | Fuente actual | `id` | `name` (hoy) | `short_name` (hoy) | Gap vs objetivo |
|-----|---------------|------|--------------|--------------------|-----------------|
| `kai-admin` | `app/manifest.ts` | `kai-admin` | según producto | `KS/KF/KV Admin` | **Hecho** |
| `kai-pos` | `public/manifest.json` | `kai-pos` | KaiStore POS | `KS POS` | **Hecho** |
| `kai-stock` | `public/manifest.json` | `kai-stock` | KaiStore Stock | `KS Stock` | **Hecho** |
| `kai-eshop` | `src/app/manifest.ts` | `kai-eshop` | KaiStore eShop | `KS Shop` | **Hecho** |
| `kai-delivery` | `public/manifest.json` | `kai-delivery` | KaiStore Delivery | `KS Delivery` | **Hecho** |
| `kai-waiter` | `public/manifest.json` | `kai-waiter` | KaiFood Mesero | `KF Mesero` | **Hecho** |
| `kai-kds` | `public/manifest.json` | `kai-kds` | KaiFood KDS | `KF KDS` | **Hecho** |
| `kai-board` | `public/manifest.json` | `kai-board` | KaiFood Board | `KF Board` | **Hecho** |

### 4.2 Presentación / chrome

| App | `display` | `orientation` | `theme_color` | `background_color` | `lang` | Homologable |
|-----|-----------|---------------|---------------|--------------------|--------|-------------|
| admin / pos / stock / delivery / eshop | `standalone` | `portrait-primary` | `#002B59` | `#ffffff` | `es-CL` | Sí (familia KaiStore) |
| waiter / kds | `standalone` | `any` | `#1e73ae` | `#0f172a` | `es-CL` | Familia KaiFood ops |
| board | `fullscreen` | `landscape` | `#070b12` | `#070b12` | `es-CL` | OK por rol; no igualar a portrait |

**Nota:** no homologar `start_url` / `display` / `orientation` entre roles. Sí homologar `lang`, presencia de `id`, patrón de iconos y convención de nombres.

`start_url` actuales (correctos por rol):

| App | `start_url` |
|-----|-------------|
| admin, stock, eshop, board | `/` |
| pos | `/pos` |
| delivery | `/repartos` |
| waiter | `/salon` |
| kds | `/queue` |

### 4.3 Iconos y shortcuts

| App | Set any+maskable 192/512 | `shortcuts` | Notas |
|-----|--------------------------|-------------|-------|
| admin | Sí | Sí | Referencia |
| pos | Sí | Sí | |
| stock | Sí | No | Opcional añadir |
| eshop | Sí | Sí | |
| delivery | Sí | No | Opcional |
| waiter / kds / board | Sí (any+maskable 192/512; maskable interim desde logo) | No | Brand pipeline puede refinar safe-zone |

### 4.4 Fuentes duplicadas / stale (riesgo)

| Archivo | Problema |
|---------|----------|
| `kai-admin/public/manifest.json` | **Eliminado** — fuente única `app/manifest.ts` |
| `kai-pos/public/icons/manifest.json` | **Eliminado** |
| `kai-stock/public/icons/manifest.json` | **Eliminado** |

**Regla:** una sola fuente por app.

| Preferencia | Cuándo |
|-------------|--------|
| `app/manifest.ts` (o `src/app/manifest.ts`) | Apps Next App Router (permite `id` + producto dinámico). |
| `public/manifest.json` | Solo si no hay Metadata Route; referenciado por `metadata.manifest`. |

No mezclar ambos en la misma app.

---

## 5. Estándar de campos (checklist de implementación)

Campos **obligatorios** en toda PWA Kai:

```json
{
  "id": "kai-<slug>",
  "name": "<Producto> <Rol largo>",
  "short_name": "<KS|KF|KV> <Rol corto>",
  "description": "…",
  "start_url": "<ruta de entrada del rol>",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary | any | landscape",
  "background_color": "<hex>",
  "theme_color": "<hex>",
  "lang": "es-CL",
  "icons": [ /* any+maskable 192 y 512; ver PWA-ICONOS-Y-FAVICONS.md */ ]
}
```

Opcionales recomendados:

- `shortcuts` (máx. 2–4; iconos 192 propios).
- `categories` si se publica en stores (`business`, `food`, etc.).

Metadata Next alineada (`layout.tsx`):

- `applicationName` ≈ `name` o título de producto.
- `appleWebApp.title` ≈ `short_name` o nombre corto legible.
- `themeColor` = mismo hex que `theme_color` del manifest.
- `icons.apple` → `/apple-touch-icon.png` (180), no un único `logo.png`.

---

## 6. Paletas por familia (theme / background)

| Familia | Apps | `theme_color` | `background_color` |
|---------|------|---------------|--------------------|
| KaiStore (claro) | admin*, pos, stock, eshop, delivery | `#002B59` | `#ffffff` |
| KaiFood ops (oscuro) | waiter, kds | `#1e73ae` | `#0f172a` |
| Board monitor | board | `#070b12` | `#070b12` |

\* Admin en modo KaiFood/KaiServices puede adoptar theme del vertical si el producto lo define; documentar en el manifest dinámico.

---

## 7. Matriz de gaps (prioridad)

| Prioridad | Gap | Apps | Acción |
|-----------|-----|------|--------|
| P0 | `short_name` colisionan (`KaiStore`) | admin, eshop | Aplicar tabla §3.3 |
| P0 | Manifests stale en `public/icons/` | pos, stock | Eliminar archivos huérfanos |
| P1 | Falta `id` estable | pos, stock, delivery, waiter, kds, board | Añadir `kai-<slug>` |
| P1 | `id` legado `kaistore-*` | admin, eshop | Migrar a `kai-*` (coordinar: cambio de `id` puede verse como app nueva) |
| P1 | Icon set mínimo | waiter, kds, board | Pipeline `brand:icons` + actualizar manifest |
| P2 | Una sola fuente de manifest | admin | Quitar JSON estático o dejar de usarlo |
| P2 | `short_name` sin marca | stock, delivery, waiter | Prefijos KS/KF |
| P3 | Shortcuts | stock, delivery, food apps | Según utilidad real |

---

## 8. Cómo verificar

1. Abrir `https://<host>/manifest.webmanifest` o `/manifest.json` (según app).
2. Chrome DevTools → Application → Manifest: sin warnings de iconos / `short_name`.
3. Instalar en Android: el label bajo el icono debe ser el `short_name` objetivo y **único** frente a las otras PWAs Kai del mismo dispositivo.
4. iOS: el título de “Añadir a inicio” sigue `apple-mobile-web-app-title` / `appleWebApp.title` — mantenerlo coherente con `short_name`.

---

## 9. Decisión de producto (resumen)

| Tema | Decisión |
|------|----------|
| Esquema `short_name` | Prefijo vertical (`KS` / `KF` / `KV`) + rol corto |
| Límite | ≤ 12 caracteres |
| `id` | `kai-<slug>` estable, independiente del producto de build |
| Colores | Familia Store clara vs Food ops oscura; Board aparte |
| Iconos | Doc de iconos; no un solo `logo.png` |
| Fuente | Una por app; preferir `manifest.ts` en Next |

Cualquier cambio a `id` o `short_name` en producción debe anunciarse: usuarios pueden ver un icono “nuevo” o tener que reinstalar según el navegador.
