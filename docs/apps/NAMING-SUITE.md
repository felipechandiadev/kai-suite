# Naming de la suite — tabla maestra

Fuente de verdad de **cómo se llama cada app** en el launcher / dock / menú Inicio, qué **id estable** usa, y cómo se llaman las **carpetas del monorepo** (clientes + **Kai Core**). Aplica a PWAs, nativos y el API.

**Producto vertical vs app vs topbar** (KaiStore / KaiFood, empresa activa): [`PRODUCTOS-Y-APPS.md`](./PRODUCTOS-Y-APPS.md).

**Última revisión:** julio 2026  
**Detalle web:** [`MANIFESTOS-PWA.md`](./MANIFESTOS-PWA.md) · **Detalle nativo:** [`MANIFESTOS-NATIVOS.md`](./MANIFESTOS-NATIVOS.md) · **Iconos:** [`PWA-ICONOS-Y-FAVICONS.md`](../project/PWA-ICONOS-Y-FAVICONS.md)

---

## 1. Principios

1. **Un rol = un id** que no se reutiliza entre apps.
2. El **nombre corto visible** debe ser único en un dispositivo que tenga varias apps Kai instaladas.
3. Prefijos de vertical en labels PWA: `KS` (KaiStore), `KF` (KaiFood), `KV` (KaiServices) — ver §3.
4. Agentes nativos usan marca **Kai + rol** (inglés operativo: Printers, CFD); no llevan prefijo KS/KF porque no son del vertical de negocio del tenant.
5. Cambiar un id en producción (`applicationId`, Tauri `identifier`, o `id` del Web Manifest) puede verse como **app nueva** → requiere plan de migración.
6. **Carpetas del monorepo** = `kai-<slug>` en kebab-case (ver §6). No usar `pwa-` ni camelCase (`kaiPOS`).

### Equivalencias de campo (no mezclar capas)

| Concepto | PWA (Web Manifest) | Android | Desktop (Tauri) | Carpeta monorepo |
|----------|--------------------|---------|-----------------|------------------|
| Id estable | `id` | `applicationId` | `identifier` | — |
| Nombre corto (launcher) | `short_name` | `app_name` | `productName` | — |
| Nombre largo | `name` | (mismo o About) | título ventana / About | — |
| Iconos app | `icons[]` | adaptive / mipmap | `bundle.icon` + tray | — |
| Path en repo | — | — | — | `kai-<slug>` |

Renombrar la **carpeta** no cambia el label del launcher ni el `applicationId`. Son migraciones distintas.

---

## 2. Tabla maestra — objetivo

### 2.1 Apps web (PWA)

| Carpeta hoy | Carpeta objetivo | `id` (web) | `name` | `short_name` (≤12) |
|-------------|------------------|------------|--------|---------------------|
| `kai-admin` | **`kai-admin`** | `kai-admin` | KaiStore Administración* | `KS Admin` |
| `kai-pos` | **`kai-pos`** | `kai-pos` | KaiStore POS* | `KS POS` |
| `kai-stock` | **`kai-stock`** | `kai-stock` | KaiStore Stock | `KS Stock` |
| `kai-eshop` | **`kai-eshop`** | `kai-eshop` | KaiStore eShop | `KS Shop` |
| `kai-delivery` | `kai-delivery` | `kai-delivery` | KaiStore Delivery | `KS Delivery` |
| `kai-waiter` | `kai-waiter` | `kai-waiter` | KaiFood Mesero | `KF Mesero` |
| `kai-menu` | `kai-menu` | `kai-menu` | KaiFood Menú | `KF Menú` |
| `kai-kds` | `kai-kds` | `kai-kds` | KaiFood KDS | `KF KDS` |
| `kai-board` | `kai-board` | `kai-board` | KaiFood Board | `KF Board` |

\* Si el build usa `NEXT_PUBLIC_KAI_PRODUCT=kaifood|kaiservices`, el prefijo de `short_name` / texto de `name` sigue el vertical (`KF` / `KV`); el **`id`** y el **slug de carpeta** no cambian.

### 2.2 Nativos

| Carpeta hoy | Carpeta objetivo | Id estable | Label launcher (objetivo) | Hoy (gap) |
|-------------|------------------|------------|---------------------------|-----------|
| `kai-printers-android` | `kai-printers-android` | `com.kaistore.kaiprinters` | `Kai Printers` | OK (`app_name`) |
| `kai-printers-desktop` | `kai-printers-desktop` | `com.kaistore.kaiprinters` | `Kai Printers` | OK |
| `kai-screen-android` | `kai-screen-android` *(opcional más adelante: `kai-cfd-android`)* | `com.kaistore.kaiscreen` | **`Kai CFD`** | OK (`app_name`) |

Mismo `identifier` / `applicationId` base `com.kaistore.kaiprinters` en Android y Desktop es intencional. CFD es app distinta → `com.kaistore.kaiscreen` (id legado; no renombrar el package id sin plan).

### 2.3 Decisión de marca — Customer Facing Display (CFD)

En retail / POS, la segunda pantalla orientada al comprador se conoce como:

| Ámbito | Término |
|--------|---------|
| Industria (global) | **Customer Facing Display (CFD)** |
| Español (mostrador) | Visor de cliente · Pantalla secundaria / pantalla cliente |

**Decisión Kai (objetivo de producto):**

| Capa | Valor |
|------|--------|
| Marca / launcher (`app_name`) | **`Kai CFD`** |
| Rol en docs técnicos | Customer Facing Display (CFD) |
| Copy UI POS (es-CL) | Preferir **Visor de cliente** o “Pantalla cliente”, con aclaración *(Kai CFD)* donde haga falta onboarding |
| Nombre legado (código / carpeta / downloads) | `kai-screen-*`, `Kai Screen`, `com.kaistore.kaiscreen` |

**Por qué `Kai CFD` y no “Screen”:** “Screen” no es el término de industria ni dice *para quién* es la vista. CFD es el término moderno/global y queda paralelo a **Kai Printers**. Riesgo: un cajero nuevo puede no saber qué significa CFD → mitigar con subtítulo en settings POS (“Visor de cliente”).

**Pendiente de implementación (no solo doc):**

- [x] `app_name` en `kai-screen-android` → `Kai CFD`
- [x] Textos POS (settings pantalla cliente) → “Kai CFD” + visor de cliente
- [ ] Textos admin/landing que digan solo “Kai Screen” → “Kai CFD” (pendiente)
- [x] Ofertas de descarga (`kai-screen-downloads`, títulos) → marca Kai CFD
- [x] **No** cambiar `applicationId` / nombres de archivo APK / carpetas en el mismo PR salvo migración explícita

---

## 3. Prefijos de vertical (solo labels PWA de negocio)

| Prefijo | Producto | Ejemplo |
|---------|----------|---------|
| `KS` | KaiStore | `KS POS` |
| `KF` | KaiFood | `KF Mesero` |
| `KV` | KaiServices | `KV Admin` |

No aplicar `KS`/`KF` a Printers / CFD: son **infra de tienda**, no un módulo del vertical del tenant.

---

## 4. Estado vs objetivo — labels

| App | Label / short hoy | Objetivo | Gap |
|-----|-------------------|----------|-----|
| admin | `KaiStore` | `KS Admin` | Colisión con eShop |
| pos | `KaiStore POS` | `KS POS` | Prefijo |
| stock | `StockControl` | `KS Stock` | Sin marca |
| eshop | `KaiStore` | `KS Shop` | Colisión |
| delivery | `Delivery` | `KS Delivery` | Sin marca |
| waiter | `Mesero` | `KF Mesero` | Sin marca |
| kds | `KaiFood KDS` | `KF KDS` | Preferir corto |
| board | `Kai Board` | `KF Board` | Vertical |
| printers Android | `Kai Printers` | `Kai Printers` | — |
| printers Desktop | **`Kai Printers`** | `Kai Printers` | — |
| CFD (ex Screen) | **`Kai CFD`** | **`Kai CFD`** | — |

---

## 5. Otros paths del monorepo (no son clientes instalables)

| Carpeta hoy | Carpeta objetivo | Rol | Notas |
|-------------|------------------|-----|-------|
| `kai-core` | **`kai-core`** | API Nest — producto **Kai Core** | Rename **no urgente** (ver §5.1) |
| `landing` | `landing` | Sitio comercial | Mantener |
| `packages/*` | — | Librerías `@kai/*` | Ya bajo scope npm |
| `seeds/`, `envs/`, `deploy/`, `docs/` | — | Infra / docs | Mantener |
| `services/kai-mail` | — | Sidecar HTTP mail | **npm workspace** raíz (`npm run mail:dev`) |
| `services/kai-voice` | — | Sidecar TTS | Python `.venv` (no workspace npm) |
| `services/kai-osrm` | *(crear)* | Ops OSRM | **Pendiente** — sacar de `kai-core/docker-compose` |
| `kai-kaiter` | — | Vacío / residual | **Eliminar** si sigue existiendo (no es app; typo de `kai-waiter`) |

### 5.1 Kai Core (`kai-core` → `kai-core`)

**Marca de producto: sí — ya es “Kai Core”.**  
**Rename urgente de carpeta: no** — prioridad por debajo de unificar `pwa-*` → `kai-*`.

#### Cómo está hoy

| Capa | Valor actual |
|------|----------------|
| Carpeta | `kai-core` |
| npm `package.json` (`name`) | `kai-core` (legado Flow) |
| Dominio demo | `core.demo.kaisuite.pro` → backend ([`domains-demo.md`](../domains-demo.md)) |
| Landing / narrativa | **Kai Core** (API multi-tenant, auth, contabilidad, etc.) |

El **producto** ya se llama Core; el **path del repo** sigue siendo genérico `kai-core`.

#### ¿Renombrar a `kai-core`?

| A favor | En contra / coste |
|---------|-------------------|
| Alinea carpeta con dominio, landing y suite (`kai-pos`, `kai-admin`…) | Cientos de refs: seeds (`../../kai-core/...`), envs, deploy, scripts, docs, CI |
| Deja atrás `kai-core` | No está en npm workspaces del root como las PWAs, pero igual rompe paths |
| Más claro para agentes / onboarding | `kai-core` es universal y nadie se confunde hoy |

#### Decisión

| Pregunta | Respuesta |
|----------|-----------|
| ¿El nombre correcto del servicio es Kai Core? | **Sí** |
| ¿La carpeta debería ser `kai-core` a largo plazo? | **Sí**, coherente con la suite |
| ¿Hay que hacerlo ahora? | **No urgente**; gap documentado; migrar cuando toque infra/deploy |
| ¿Es como `kai-kaiter`? | **No** — es el corazón del sistema; solo el *nombre de carpeta* (y el npm `name`) son mejorables |

#### Al migrar (PR dedicado, prioridad baja–media)

1. Primero completar (o al menos no bloquear) `pwa-*` → `kai-*` (§6.3).
2. `git mv backend` → **`kai-core`** (kebab-case; no `kaiCore` / `KaiCore`).
3. En el mismo PR o seguido: `package.json` `name` `kai-core` → `kai-core` o `@kai/core`.
4. Actualizar seeds, envs (`kai-core.env.example` → naming coherente), deploy, docs.
5. El hostname `core.demo.kaisuite.pro` **no** obliga al rename de carpeta; el mapeo dominio → servicio ya es correcto.

---

## 6. Carpetas del monorepo — estándar

### 6.1 Decisión

| Regla | Valor |
|-------|--------|
| Formato | **`kai-<slug>`** en **kebab-case** |
| Alineación | El slug de carpeta = slug del `id` web (`kai-pos` ↔ `id: "kai-pos"`) |
| Prefijo `pwa-` | **Deprecado** — ya no distingue canal (waiter/kds/delivery también son PWA) |
| CamelCase / PascalCase | **Prohibido** en carpetas (`kaiPOS`, `KaiPos`, `kaiPos` → no) |

### 6.2 Por qué no `kaiPOS` u otros

- Scripts, workspaces npm, CI, VPS y docs asumen paths kebab-case.
- Debe coincidir con `id` del Web Manifest y con convención ya usada en `kai-waiter`, `kai-delivery`, etc.
- El label visible del launcher es otra capa (`KS POS`), no el nombre de carpeta.

### 6.3 Migración `pwa-*` → `kai-*` (**hecho** 2026-07-30)

| Hoy | Objetivo | Estado |
|-----|----------|--------|
| `kai-admin` | `kai-admin` | **Hecho** |
| `kai-pos` | `kai-pos` | **Hecho** |
| `kai-stock` | `kai-stock` | **Hecho** |
| `kai-eshop` | `kai-eshop` | **Hecho** |
| `kai-delivery`, `kai-waiter`, `kai-kds`, `kai-board` | — | Ya OK |
| `kai-printers-*`, `kai-screen-android` | — | OK; CFD opcional `kai-cfd-android` después |
| `kai-core` | `kai-core` | **Hecho** (antes `backend` / npm `flow-backend`) |

**Alcance del rename:**

- Root `package.json` → `workspaces`
- `envs/` (`kai-*.env.local.example`, `kai-core.env.example`), `deploy/`, scripts `dev-*` / `setup-*`
- Docs, `AGENTS.md`, paths en VPS
- Referencias en código a paths

No mezclar en el mismo PR futuro: rename de carpetas + cambio de `short_name` + rename CFD de `applicationId` (ya aplicados en fases distintas del épico docs/apps).

### 6.4 Checklist al renombrar una carpeta de app

- [x] `git mv` carpeta + actualizar `workspaces`
- [x] Grep de `pwa-<slug>` en repo (envs, deploy, scripts, docs)
- [ ] `npm install` / smoke `dev` de esa app
- [x] Actualizar esta tabla (§2.1 / §6.3)
- [ ] Coordinar path en VPS / demo si el deploy monta por nombre de carpeta

---

## 7. Checklist al añadir una app

- [ ] Elegir slug **`kai-<slug>`** (carpeta + `id` web, o `com.kaistore.<slug>` si es nativo)
- [ ] Carpeta en kebab-case bajo la raíz del monorepo (o `packages/` si es librería)
- [ ] Definir label corto único (PWA ≤12 chars si es `short_name`)
- [ ] Documentar en §2 de esta hoja + doc PWA o nativo según canal
- [ ] Iconos vía pipeline de marca (`brand:icons` / assets nativos)
- [ ] Si es agente descargable: entry en [`RELEASE-MANIFESTS.md`](./RELEASE-MANIFESTS.md)
- [ ] Registrar en root `package.json` `workspaces` si aplica
