# Variables de entorno — desarrollo local

Puertos frontends en **506x** (demo VPS); **backend local 5050** (Next.js bloquea fetch a `:5060`); en VPS/demo backend **5060**; kai-mail **5040**; landing **5066**.

Ver también `deploy/ports.demo.env.example` y `docs/domains-demo.md`.

## Modelo: matriz + fragmentos

```
envs/shared.env.example     ← matriz (deploy + infra + secretos + seed)
        +
envs/backend.env.example    ← solo lo específico del API
envs/pwa-*.env.local.example
envs/kai-delivery.env.local.example
envs/kai-waiter.env.local.example
envs/kai-kds.env.local.example
        ↓
envs/sync-dev-envs.sh       ← merge + proyección
        ↓
backend/.env, pwa-*/.env.local, kai-*/.env.local, services/kai-mail/.env
```

**Editar desarrollo:** cambia la matriz (`shared.env.example` o copia local `shared.env`) y regenera con `npm run env:dev`.

Opcional: `cp envs/shared.env.example envs/shared.env` para overrides locales (gitignored).

## Manifiesto de deploy (matriz)

| Variable | Ejemplo | Efecto |
|----------|---------|--------|
| `KAI_PRODUCT` | `kaistore` \| `kaifood` \| `kaiservices` \| `kaisuite` | Marca / `NEXT_PUBLIC_APP_NAME`; `kaisuite` habilita food + retail |
| `MEDIA_OPTIMIZE_ENABLED` | `true` / `false` | Compresión Sharp + variantes al subir (seed y API) |
| `MEDIA_OPTIMIZE_MAX_INPUT_PX` | `4096` | Límite de lado mayor antes de generar variantes |
| `KAI_DEPLOY_PROFILE` | `lite` \| `eshop` \| `retail-full` | Fallback si `KAI_DEPLOY_APPS` vacío |
| `KAI_FEATURE_ESHOP` | `true` / `false` | → `NEXT_PUBLIC_ESHOP_ENABLED` (admin) |
| `KAI_FEATURE_JEWELRY` | `true` / `false` | → `NEXT_PUBLIC_JEWELRY_ENABLED` (metales, calculadora) |
| `KAI_FEATURE_MULTI_COMPANY` | `true` / `false` | → menú Empresas (SUPER_ADMIN) |
| `KAI_DEPLOY_APPS` | `backend,admin,pos,stock,eshop,delivery,waiter,kds,mail,landing` | `scripts/dev-apps.sh` / `npm run dev` |

Perfiles listos en `envs/profiles/*.env.example` (copiar líneas a `shared.env`):

| Perfil | Uso |
|--------|-----|
| `profiles/kaisuite.env.example` | Plataforma completa (retail + food + joyería + eShop + waiter/kds) |
| `profiles/kaifood.env.example` | Salón, KDS, mesero (`waiter`, `kds`) |
| `profiles/joyarte.env.example` | Joyería + eShop |
| `profiles/san-sebastian.env.example` | Super, sin eShop ni joyería |
| `profiles/demo.env.example` | Mi Empresa multi-empresa, sin joyería |

Desarrollo San Sebastián: `npm run setup:san-sebastian` (seed + `shared.env`) y `npm run dev:san-sebastian`.

## Uso rápido

```bash
npm run dev                  # infra + apps según envs/shared.env (KAI_DEPLOY_APPS)
npm run env:dev              # regenera .env de cada app (forzado)
```

## Puertos por app

| App          | Puerto | Fragmento                         | Destino                        |
|--------------|--------|-----------------------------------|--------------------------------|
| Backend      | 5060   | `backend.env.example`             | `backend/.env`                 |
| pwa-admin    | 5071   | `pwa-admin.env.local.example`     | `pwa-admin/.env.local`         |
| pwa-pos      | 5062   | `pwa-pos.env.local.example`       | `pwa-pos/.env.local`           |
| pwa-stock    | 5063   | `pwa-stock.env.local.example`     | `pwa-stock/.env.local`         |
| pwa-eshop    | 5064   | `pwa-eshop.env.local.example`     | `pwa-eshop/.env.local`         |
| kai-delivery | 5065   | `kai-delivery.env.local.example`  | `kai-delivery/.env.local`      |
| kai-waiter   | 5067   | `kai-waiter.env.local.example`    | `kai-waiter/.env.local`        |
| kai-kds      | 5068   | `kai-kds.env.local.example`       | `kai-kds/.env.local`           |
| kai-board    | 5069   | `kai-board.env.local.example`     | `kai-board/.env.local`         |
| landing      | 5066   | —                                 | `landing/` (Astro)             |
| kai-mail     | 5040   | `kai-mail.env.example`            | `services/kai-mail/.env`       |

## Notas

- Deploy (env) vs tenant (BD): `KAI_FEATURE_ESHOP` habilita el módulo en la instancia; `company.settings.eShopEnabled` activa eShop por empresa.
- Tras `seed:*`, actualiza UUID/slug en la matriz.
- `CORS_ORIGIN` se genera en sync desde puertos PWA.
- LAN: cambia `KAI_DEV_HOST` y `npm run env:dev`.

## Service Workers (PWA)

Estándar, auditoría por app y niveles L1–L3: **[`docs/apps/SERVICE-WORKERS.md`](../docs/apps/SERVICE-WORKERS.md)**.

Todas las apps front registran `/sw.js` en **producción**, y en **desarrollo** cuando `NEXT_PUBLIC_SW_DEV=1` (incluido en cada fragmento `envs/*.env.local.example`).

```bash
npm run env:dev   # regenera .env.local (forzado) — necesario tras cambiar examples
```

Reiniciá Next tras el sync: las vars `NEXT_PUBLIC_*` se inyectan al arrancar.

| App | SW | Web Push |
|-----|----|----------|
| pwa-pos | offline + push | sí (`clientApp=pos`) |
| kai-kds | shell + push | sí (`clientApp=kds`) |
| pwa-admin / pwa-stock / pwa-eshop / kai-delivery / kai-waiter | cache/offline | no |

### VAPID (toasts nativos POS/KDS)

En `backend/.env` (ver `envs/backend.env.example`):

```bash
cd backend && npx web-push generate-vapid-keys
# pegar VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT
```

Sin keys el push queda deshabilitado; inbox/WS siguen OK.

### Checklist DevTools

1. Application → Service Workers → `/sw.js` **activated**.
2. Si no aparece: confirmá `NEXT_PUBLIC_SW_DEV=1` en `.env.local`, reiniciá la app, hard refresh.
3. POS/KDS: Notifications = granted; Push messaging con suscripción; Network `POST .../push/subscribe` → 200.
4. Residuos viejos: Application → Clear site data (eshop ya no desregistra en localhost).
5. POS en localhost: el SW **no** intercepta fetch/RSC (solo push); en prod sí aplica cache offline.
6. Migración `web_push_subscriptions` aplicada (`cd backend && npm run migration:run`). Sin la tabla el subscribe falla y no hay toast real (el “Test push” de DevTools sí funciona porque es local).
