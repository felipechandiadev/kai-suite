# Service Workers PWA — estado actual y estándar Kai

Evaluación de `/sw.js` en todas las PWAs del monorepo: registro, caches, estrategias offline y Web Push.

**Última revisión:** julio 2026  
**Audiencia:** frontends, producto técnico, agentes IA.  
**Relacionado:** [`NAMING-SUITE.md`](./NAMING-SUITE.md), [`MANIFESTOS-PWA.md`](./MANIFESTOS-PWA.md), [`MANIFESTOS-NATIVOS.md`](./MANIFESTOS-NATIVOS.md), [`PWA-ICONOS-Y-FAVICONS.md`](../project/PWA-ICONOS-Y-FAVICONS.md), [`envs/README.md`](../../envs/README.md) (vars + checklist DevTools), [`IF-02`](../implementaciones-futuras/IF-02-pos-offline-first.md) (visión offline POS).

---

## 1. Objetivo

Que cada PWA Kai:

1. Registre un SW de forma **predecible** (prod siempre; dev solo con flag).
2. Use **nombres de cache** con marca `kai-*` y versión bumpeable.
3. Declare un **nivel de capacidad** explícito (mínimo / shell / offline-POS).
4. No cachee de más (manifest, `/api/`, HMR) ni rompa App Router en localhost.
5. Centralice Web Push solo donde el producto lo requiere (hoy POS + KDS).

El manifesto (`short_name`, `id`, iconos) **no** define el SW; son capas distintas. Ver [`MANIFESTOS-PWA.md`](./MANIFESTOS-PWA.md).

---

## 2. Apps en alcance

| Paquete | Archivo SW | Registro |
|---------|------------|----------|
| `pwa-admin` | `public/sw.js` | `app/layout.tsx` |
| `pwa-pos` | `public/sw.js` | `src/app/layout.tsx` |
| `pwa-stock` | `public/sw.js` | `src/app/layout.tsx` |
| `pwa-eshop` | `public/sw.js` | `src/app/layout.tsx` |
| `kai-delivery` | `public/sw.js` | `src/app/layout.tsx` |
| `kai-waiter` | `public/sw.js` | `src/app/layout.tsx` |
| `kai-kds` | `public/sw.js` | `src/app/layout.tsx` |
| `kai-board` | `public/sw.js` | `src/app/layout.tsx` |

Patrón de registro (todas):

```js
const registerServiceWorker =
  process.env.NODE_ENV === "production" ||
  process.env.NEXT_PUBLIC_SW_DEV === "1";

navigator.serviceWorker.register("/sw.js");
```

En desarrollo: `NEXT_PUBLIC_SW_DEV=1` vía `npm run env:dev` / fragments en `envs/`. Reiniciar Next tras cambiar la var.

---

## 3. Niveles de capacidad (estándar propuesto)

| Nivel | Código | Qué hace | Quién debería usarlo |
|-------|--------|----------|----------------------|
| **L0 — Registro** | Solo `install`/`activate` trivial o sin fetch útil | Cumple criterio “tiene SW” para instalabilidad | No usar solo; mínimo L1 |
| **L1 — Shell** | Precache rutas/iconos; navegación network-first + fallback; same-origin GET | Offline “abrir app / ver última shell” | admin, stock, eshop, delivery, waiter, board |
| **L2 — Shell + Push** | L1 + `push` + `notificationclick` | Toasts nativos | kds (hoy); waiter si se añade push |
| **L3 — Offline operativo** | Caches separados (shell / static / RSC), SWR, timeouts, bypass localhost | POS usable sin red (parcial → IF-02) | **solo** `pwa-pos` |

No subir admin/eShop a L3 sin diseño: el volumen de rutas y mutaciones no justifica el mismo modelo que el POS.

---

## 4. Estado actual (auditoría julio 2026)

### 4.1 Resumen por app

| App | Nivel real | Cache name(s) | Push | Bypass manifest | Bypass `/api/` | Offline page | Notas |
|-----|------------|---------------|------|-----------------|----------------|--------------|-------|
| `pwa-pos` | **L3** | `flow-pos-shell-v3`, `flow-pos-static-v3`, `flow-pos-rsc-v3` | Sí | No (precached) | Red pura | `offline-fallback.html` | En localhost **no** intercepta fetch (solo push) |
| `kai-kds` | **L2** | `kai-kds-v1` | Sí | No | Sí (no intercepta) | Fallback `/queue` | Icon push = `/logo.png` |
| `pwa-admin` | **L1−** | `flow-admin-v2` | No | Sí | Fallback offline en error | `offline.html` | Fetch handler incompleto (casi solo `/api/`) |
| `pwa-eshop` | **L1** | `flow-eshop-v1` | No | Sí | — | `offline.html` | OK patrón shell |
| `pwa-stock` | **L1** | `flow-stock-v1` | No | No | — | Fallback `/` | Comentario “POS” en header (copy error) |
| `kai-delivery` | **L1** | `kai-delivery-v1` | No | No | — | Fallback `/repartos` | Icon set en precache |
| `kai-waiter` | **L1** | `kai-waiter-v1` | No | No | Sí | Fallback `/` o `/login` | Precache mínimo |
| `kai-board` | **L1** | `kai-board-v1` | No | No | Sí | Fallback `/` o `/setup` | OK para monitor |

### 4.2 Homologación

| Aspecto | Estado |
|---------|--------|
| Registro + flag `NEXT_PUBLIC_SW_DEV` | **Alineado** (8/8) |
| Naming caches `kai-<app>-vN` | **Parcial** — varios `flow-*` legado |
| Bypass network para manifesto | Solo admin + eshop |
| Estrategia L1 compartida | Similar pero no idéntica |
| Push | Solo POS + KDS (correcto por producto) |
| Documentación | Notas en `envs/README.md`; este doc es la fuente de estándar |

---

## 5. Estándar de implementación

### 5.1 Naming de caches

```
kai-<slug>-v<N>           // L1 / L2 (un cache)
kai-<slug>-shell-v<N>     // L3
kai-<slug>-static-v<N>
kai-<slug>-rsc-v<N>
```

| App | Cache objetivo (al migrar) |
|-----|----------------------------|
| admin | `kai-admin-v1` *(hoy `flow-admin-v2` → bumpear al renombrar)* |
| pos | `kai-pos-shell-v1`, `kai-pos-static-v1`, `kai-pos-rsc-v1` |
| stock | `kai-stock-v1` |
| eshop | `kai-eshop-v1` |
| delivery | `kai-delivery-v1` *(ya)* |
| waiter | `kai-waiter-v1` *(ya)* |
| kds | `kai-kds-v1` *(ya)* |
| board | `kai-board-v1` *(ya)* |

Al cambiar el nombre o la estrategia: **incrementar `N`** para que `activate` borre caches viejos.

### 5.2 Reglas comunes (L1+)

1. Solo `GET` same-origin.
2. **No** cachear respuestas de `/api/` (network only; o no interceptar).
3. **Network-first** en navegaciones (`mode === "navigate"`); fallback a shell o `offline.html`.
4. Manifest: **network-only** (`/manifest.json`, `/manifest.webmanifest`) para no fijar `short_name`/`icons` viejos — recomendado en **todas** las apps.
5. `skipWaiting()` en install + `clients.claim()` en activate.
6. Precache: `start_url` del rol, login si aplica, offline page, iconos 192/512 (cuando existan; no solo `logo.png`).
7. Iconos de notificación (push): preferir `android-chrome-192x192.png` + badge `favicon-32x32.png` (KDS hoy usa `logo.png` → gap).

### 5.3 Localhost / desarrollo

| App | Política actual | Estándar |
|-----|-----------------|----------|
| POS | No intercepta fetch en `localhost` / `127.0.0.1` (evita romper RSC) | Mantener |
| Resto | Interceptan si el SW está registrado | Aceptable en L1; si hay pain con HMR, adoptar el mismo early-return que POS |

Nunca cachear paths `*.hot-update.*` (POS ya lo hace en L3).

### 5.4 Web Push

| App | `clientApp` (backend) | SW handlers | UI subscribe |
|-----|------------------------|-------------|--------------|
| `pwa-pos` | `pos` | `push` + `notificationclick` → `/pos` | `web-push-subscribe.ts` |
| `kai-kds` | `kds` | idem → `/queue` | `web-push-subscribe.ts` |
| Resto | — | No | No |

Requisitos backend: `VAPID_*` en `backend/.env`, migración `web_push_subscriptions`. Sin VAPID el push queda off; inbox/WS siguen.

Añadir push a otra app = subir a **L2** + contrato backend + iconos de notificación alineados al set PWA.

### 5.5 Relación con IF-02

El SW L3 del POS es **shell + assets + navegación**; no implementa cola de ventas ni folios offline. La operación de negocio offline completa está en [`IF-02`](../implementaciones-futuras/IF-02-pos-offline-first.md) / MVP en `docs/pos/`. No confundir “PWA con cache” con “POS offline-first”.

---

## 6. Matriz de gaps (prioridad)

| Prioridad | Gap | Apps | Acción |
|-----------|-----|------|--------|
| P0 | Caches `flow-*` legado | admin, pos, stock, eshop | Renombrar a `kai-*` + bump versión |
| P1 | Bypass manifesto no universal | stock, delivery, waiter, kds, board, pos* | Network-only para manifest en todas |
| P1 | Admin fetch demasiado mínimo | admin | Alinear a patrón L1 (nav network-first + offline.html) |
| P1 | Push icons pobres | kds | Usar chrome 192 + favicon 32 cuando existan |
| P2 | Comment/header incorrecto en stock SW | stock | Corregir copy |
| P2 | Precache solo `logo.png` | waiter, kds, board | Tras homologar iconos PWA |
| P3 | Unificar helpers L1 (opcional) | varias | Package o snippet compartido — solo si el copy-paste duele |
| — | Subir a L3 | no-POS | **No**, salvo diseño explícito |

\* POS precachea `manifest.json`; valorar network-only en fetch como admin/eshop.

---

## 7. Checklist (nueva PWA o revisión)

- [ ] `public/sw.js` presente y referenciado desde layout
- [ ] Registro gated: prod \|\| `NEXT_PUBLIC_SW_DEV=1`
- [ ] Nivel L1/L2/L3 acordado y documentado en la tabla §4
- [ ] Cache name `kai-<slug>-…-vN`
- [ ] Bypass `/api/` y manifesto (network-only)
- [ ] Fallback offline con página o `start_url` del rol
- [ ] Si push: handlers + subscribe client + VAPID + `clientApp`
- [ ] DevTools: SW activated; Clear site data tras bump de cache
- [ ] No duplicar lógica de manifesto aquí — ver MANIFESTOS

---

## 8. Cómo verificar

1. Application → Service Workers → `/sw.js` **activated**.
2. Si no aparece en dev: `NEXT_PUBLIC_SW_DEV=1`, reinicio Next, hard refresh.
3. Application → Cache Storage: solo nombres `kai-*` esperados tras migrate.
4. Offline (DevTools Network → Offline): navegación cae al fallback, no pantalla blanca.
5. POS/KDS push: Notifications granted; `POST …/push/subscribe` 200; toast al enviar.
6. POS localhost: soft navigations Next no deben colgarse por timeout del SW.

Detalle operativo de env/VAPID: [`envs/README.md`](../../envs/README.md) § Service Workers.

---

## 9. Decisión de producto (resumen)

| Tema | Decisión |
|------|----------|
| Documento | Separado de manifiestos (esta hoja) |
| Registro | Prod siempre; dev con `NEXT_PUBLIC_SW_DEV` |
| Niveles | L1 shell default; L2 + push; L3 solo POS |
| Caches | Prefijo `kai-`, versión bumpeable |
| Push | Solo POS + KDS salvo nuevo requisito |
| Manifest vs SW | Capas distintas; SW no debe fijar manifesto en cache |

Cambio de nombre de cache o de estrategia = bump de versión; usuarios pueden necesitar “Clear site data” si un SW viejo quedó stuck.
